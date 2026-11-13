#!/usr/bin/env python3
import argparse
import base64
import hashlib
import json
import math
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path


def parse_obj(path):
    positions = []
    faces = []
    with open(path, "r", encoding="utf-8", errors="replace") as stream:
        for raw in stream:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            fields = line.split()
            if fields[0] == "v" and len(fields) >= 4:
                positions.append((float(fields[1]), float(fields[2]), float(fields[3])))
            elif fields[0] == "f" and len(fields) >= 4:
                polygon = []
                for token in fields[1:]:
                    value = token.split("/")[0]
                    if not value:
                        continue
                    index = int(value)
                    index = index - 1 if index > 0 else len(positions) + index
                    if 0 <= index < len(positions):
                        polygon.append(index)
                for index in range(1, len(polygon) - 1):
                    faces.append((polygon[0], polygon[index], polygon[index + 1]))
    if not positions or not faces:
        raise ValueError("OBJ contains no triangulated mesh")
    return positions, faces


def parse_fbx_array(text, name, integer=False):
    pattern = r"\b" + re.escape(name) + r"\s*:\s*\*\d+\s*\{\s*a\s*:\s*([^}]*)\}"
    match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE | re.DOTALL)
    if not match:
        return []
    values = re.findall(r"[-+]?\d+(?:\.\d*)?(?:[eE][-+]?\d+)?", match.group(1))
    return [int(float(value)) for value in values] if integer else [float(value) for value in values]


def parse_ascii_fbx(path):
    data = Path(path).read_bytes()
    text = data.decode("utf-8", errors="replace")
    if b"Kaydara FBX Binary" in data[:256]:
        raise ValueError("binary FBX requires Blender or another FBX SDK")
    values = parse_fbx_array(text, "Vertices")
    polygon_indices = parse_fbx_array(text, "PolygonVertexIndex", True)
    if len(values) < 9 or len(values) % 3:
        raise ValueError("ASCII FBX has no usable Geometry Vertices array")
    if not polygon_indices:
        raise ValueError("ASCII FBX has no usable PolygonVertexIndex array")
    positions = [(values[i], values[i + 1], values[i + 2]) for i in range(0, len(values), 3)]
    faces = []
    polygon = []
    for raw_index in polygon_indices:
        end = raw_index < 0
        index = -raw_index - 1 if end else raw_index
        if index < 0 or index >= len(positions):
            raise ValueError("ASCII FBX polygon index is outside the vertex array")
        polygon.append(index)
        if end:
            if len(polygon) >= 3:
                for i in range(1, len(polygon) - 1):
                    faces.append((polygon[0], polygon[i], polygon[i + 1]))
            polygon = []
    if polygon:
        if len(polygon) >= 3:
            for i in range(1, len(polygon) - 1):
                faces.append((polygon[0], polygon[i], polygon[i + 1]))
    if not faces:
        raise ValueError("ASCII FBX has no usable polygons")
    return positions, faces


def apply_scale(positions, scale):
    return [(x * scale, y * scale, z * scale) for x, y, z in positions]


def pack_gltf(positions, faces):
    vertex_bytes = b"".join(struct.pack("<3f", *vertex) for vertex in positions)
    max_index = max(max(face) for face in faces)
    index_format = "<H" if max_index < 65536 else "<I"
    index_component = 5123 if max_index < 65536 else 5125
    index_bytes = b"".join(struct.pack(index_format, index) for face in faces for index in face)
    index_offset = (len(vertex_bytes) + 3) & ~3
    binary = vertex_bytes + b"\0" * (index_offset - len(vertex_bytes)) + index_bytes
    encoded = base64.b64encode(binary).decode("ascii")
    minimum = [min(vertex[i] for vertex in positions) for i in range(3)]
    maximum = [max(vertex[i] for vertex in positions) for i in range(3)]
    gltf = {
        "asset": {"version": "2.0", "generator": "Faoxom asset pipeline"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "FBXMesh"}],
        "meshes": [{"name": "FBXMesh", "primitives": [{"attributes": {"POSITION": 0}, "indices": 1, "mode": 4}]}],
        "buffers": [{"byteLength": len(binary), "uri": "data:application/octet-stream;base64," + encoded}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(vertex_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": index_offset, "byteLength": len(index_bytes), "target": 34963}
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": len(positions), "type": "VEC3", "min": minimum, "max": maximum},
            {"bufferView": 1, "componentType": index_component, "count": len(faces) * 3, "type": "SCALAR"}
        ]
    }
    return gltf


def write_gltf(path, positions, faces):
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    document = pack_gltf(positions, faces)
    if destination.suffix.lower() != ".glb":
        destination.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")
        return
    uri = document["buffers"][0]["uri"]
    binary = base64.b64decode(uri.split(",", 1)[1])
    document["buffers"][0] = {"byteLength": len(binary)}
    json_chunk = json.dumps(document, separators=(",", ":")).encode("utf-8")
    json_chunk += b" " * ((4 - len(json_chunk) % 4) % 4)
    binary_chunk = binary + b"\0" * ((4 - len(binary) % 4) % 4)
    total_length = 12 + 8 + len(json_chunk) + 8 + len(binary_chunk)
    with destination.open("wb") as stream:
        stream.write(struct.pack("<4sII", b"glTF", 2, total_length))
        stream.write(struct.pack("<I4s", len(json_chunk), b"JSON"))
        stream.write(json_chunk)
        stream.write(struct.pack("<I4s", len(binary_chunk), b"BIN\0"))
        stream.write(binary_chunk)


def blender_convert(source, destination, blender):
    destination = Path(destination).resolve()
    source = Path(source).resolve()
    script = """
import bpy
import sys
source = sys.argv[-2]
destination = sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source, automatic_bone_orientation=True, use_image_search=True)
for item in list(bpy.context.scene.objects):
    item.select_set(True)
bpy.context.view_layer.objects.active = next((item for item in bpy.context.scene.objects if item.type == 'MESH'), None)
if destination.lower().endswith('.glb'):
    bpy.ops.export_scene.gltf(filepath=destination, export_format='GLB', export_apply=True, export_animations=True)
else:
    bpy.ops.export_scene.gltf(filepath=destination, export_format='GLTF_SEPARATE', export_apply=True, export_animations=True)
"""
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as handle:
        handle.write(script)
        script_path = handle.name
    try:
        result = subprocess.run([blender, "--background", "--factory-startup", "--python", script_path, "--", str(source), str(destination)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        if result.returncode != 0:
            raise RuntimeError(result.stdout[-4000:])
    finally:
        try:
            os.unlink(script_path)
        except OSError:
            pass


def convert_fbx(source, destination, blender=None, scale=1.0, ascii_only=False):
    source = Path(source)
    destination = Path(destination)
    if destination.suffix.lower() not in (".gltf", ".glb"):
        raise ValueError("FBX output must end in .gltf or .glb")
    converter = blender or shutil.which("blender")
    data = source.read_bytes()
    binary = b"Kaydara FBX Binary" in data[:256]
    if converter and not ascii_only:
        blender_convert(source, destination, converter)
        return {"mode": "blender", "output": str(destination)}
    if binary:
        raise RuntimeError("binary FBX was detected but Blender was not available; install Blender or pass --blender")
    positions, faces = parse_ascii_fbx(source)
    write_gltf(destination, apply_scale(positions, scale), faces)
    return {"mode": "ascii", "vertices": len(positions), "triangles": len(faces), "output": str(destination)}


def bounds(positions):
    minimum = [min(vertex[i] for vertex in positions) for i in range(3)]
    maximum = [max(vertex[i] for vertex in positions) for i in range(3)]
    return minimum, maximum


def cluster_mesh(positions, faces, resolution):
    minimum, maximum = bounds(positions)
    extent = [maximum[i] - minimum[i] for i in range(3)]
    groups = {}
    assignments = []
    for vertex in positions:
        key_values = []
        for axis in range(3):
            if extent[axis] <= 1e-12:
                key_values.append(0)
            else:
                key_values.append(min(resolution - 1, max(0, int((vertex[axis] - minimum[axis]) / extent[axis] * resolution))))
        key = tuple(key_values)
        if key not in groups:
            groups[key] = [0.0, 0.0, 0.0, 0]
        group = groups[key]
        group[0] += vertex[0]
        group[1] += vertex[1]
        group[2] += vertex[2]
        group[3] += 1
        assignments.append(key)
    new_positions = []
    group_indices = {}
    for key, group in groups.items():
        group_indices[key] = len(new_positions)
        new_positions.append((group[0] / group[3], group[1] / group[3], group[2] / group[3]))
    new_faces = []
    seen = set()
    for face in faces:
        reduced = tuple(group_indices[assignments[index]] for index in face)
        if len(set(reduced)) < 3 or reduced in seen:
            continue
        seen.add(reduced)
        new_faces.append(reduced)
    return new_positions, new_faces


def simplify_mesh(positions, faces, target_ratio):
    if not 0 < target_ratio <= 1:
        raise ValueError("target ratio must be greater than zero and at most one")
    target = max(1, int(len(faces) * target_ratio))
    if target >= len(faces):
        return positions, faces, 1
    high = max(2, int(round(len(positions) ** (1.0 / 3.0) * 8.0)))
    low = 1
    best = None
    best_error = float("inf")
    while low <= high:
        resolution = (low + high) // 2
        result_positions, result_faces = cluster_mesh(positions, faces, resolution)
        error = abs(len(result_faces) - target)
        if error < best_error:
            best = (result_positions, result_faces, resolution)
            best_error = error
        if len(result_faces) < target:
            low = resolution + 1
        elif len(result_faces) > target:
            high = resolution - 1
        else:
            break
    return best


def write_obj(path, positions, faces):
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8") as stream:
        stream.write("# Faoxom vertex-cluster simplifier\n")
        for vertex in positions:
            stream.write("v %.9g %.9g %.9g\n" % vertex)
        for face in faces:
            stream.write("f %d %d %d\n" % (face[0] + 1, face[1] + 1, face[2] + 1))


def simplify_file(source, destination, ratio):
    positions, faces = parse_obj(source)
    result_positions, result_faces, resolution = simplify_mesh(positions, faces, ratio)
    write_obj(destination, result_positions, result_faces)
    return {"inputVertices": len(positions), "inputTriangles": len(faces), "outputVertices": len(result_positions), "outputTriangles": len(result_faces), "resolution": resolution, "output": str(destination)}


def generate_lods(source, directory, ratios):
    positions, faces = parse_obj(source)
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    stem = Path(source).stem
    result = []
    for ratio in ratios:
        output = directory / (stem + "_lod" + str(int(round(ratio * 100))) + ".obj")
        result_positions, result_faces, resolution = simplify_mesh(positions, faces, ratio)
        write_obj(output, result_positions, result_faces)
        result.append({"ratio": ratio, "vertices": len(result_positions), "triangles": len(result_faces), "resolution": resolution, "output": str(output)})
    manifest = directory / (stem + ".lods.json")
    manifest.write_text(json.dumps({"source": str(source), "levels": result}, indent=2) + "\n", encoding="utf-8")
    return {"manifest": str(manifest), "levels": result}


def collect_dependencies(path):
    source = Path(path)
    dependencies = []
    if source.suffix.lower() in (".gltf", ".json"):
        try:
            document = json.loads(source.read_text(encoding="utf-8"))
            for buffer in document.get("buffers", []):
                uri = buffer.get("uri")
                if uri and not uri.startswith("data:"):
                    dependencies.append((source.parent / uri).resolve())
            for image in document.get("images", []):
                uri = image.get("uri")
                if uri and not uri.startswith("data:"):
                    dependencies.append((source.parent / uri).resolve())
        except (OSError, ValueError, TypeError):
            pass
    return dependencies


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def build_manifest(root, output):
    root = Path(root).resolve()
    files = {}
    candidates = [root] if root.is_file() else [item for item in root.rglob("*") if item.is_file()]
    expanded = []
    for item in candidates:
        expanded.append(item)
        expanded.extend(collect_dependencies(item))
    for item in sorted(set(expanded)):
        if item.is_file():
            try:
                relative = str(item.relative_to(root.parent if root.is_file() else root)).replace(os.sep, "/")
            except ValueError:
                relative = str(item)
            files[relative] = {"sha256": sha256_file(item), "bytes": item.stat().st_size}
    result = {"version": 1, "root": str(root), "files": files}
    destination = Path(output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return {"output": str(destination), "files": len(files)}


def validate_asset(path):
    source = Path(path)
    errors = []
    warnings = []
    if not source.exists():
        return {"valid": False, "errors": ["file does not exist"], "warnings": []}
    try:
        if source.suffix.lower() == ".obj":
            positions, faces = parse_obj(source)
            if len(positions) < 3 or len(faces) < 1:
                errors.append("mesh has no usable triangles")
        elif source.suffix.lower() in (".gltf", ".json"):
            document = json.loads(source.read_text(encoding="utf-8"))
            if document.get("asset", {}).get("version") != "2.0":
                errors.append("glTF asset version is not 2.0")
            if not document.get("scenes") and not document.get("scene") is not None:
                warnings.append("glTF has no declared scene")
            for index, buffer in enumerate(document.get("buffers", [])):
                uri = buffer.get("uri")
                if uri and not uri.startswith("data:") and not (source.parent / uri).exists():
                    errors.append("missing buffer " + str(index) + ": " + uri)
            for index, image in enumerate(document.get("images", [])):
                uri = image.get("uri")
                if uri and not uri.startswith("data:") and not (source.parent / uri).exists():
                    errors.append("missing image " + str(index) + ": " + uri)
        elif source.suffix.lower() in (".fbx", ".stl", ".ply", ".dae"):
            if source.stat().st_size == 0:
                errors.append("asset is empty")
        else:
            warnings.append("format has only existence validation")
    except Exception as error:
        errors.append(str(error))
    return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings, "file": str(source)}


def resize_texture(source, destination, width, height):
    source = Path(source).resolve()
    destination = Path(destination).resolve()
    pillow = shutil.which("python3")
    try:
        from PIL import Image
    except ImportError:
        Image = None
    if Image is not None:
        image = Image.open(source)
        image.thumbnail((width, height), Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination)
        return {"mode": "pillow", "output": str(destination), "width": image.width, "height": image.height}
    convert = shutil.which("magick") or shutil.which("convert")
    if not convert:
        raise RuntimeError("texture resizing requires Pillow or ImageMagick")
    destination.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run([convert, str(source), "-resize", str(width) + "x" + str(height) + ">", str(destination)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if result.returncode:
        raise RuntimeError(result.stdout[-2000:])
    return {"mode": "imagemagick", "output": str(destination), "width": width, "height": height}


def compress_texture(source, destination, format_name, tool=None):
    source = Path(source).resolve()
    destination = Path(destination).resolve()
    format_name = format_name.lower()
    commands = {
        "ktx2": [tool or shutil.which("toktx"), "--genmipmap", "--t2", str(destination), str(source)],
        "etc1s": [tool or shutil.which("toktx"), "--genmipmap", "--bcmp", "--t2", str(destination), str(source)],
        "uastc": [tool or shutil.which("toktx"), "--genmipmap", "--uastc", "--t2", str(destination), str(source)],
        "astc": [tool or shutil.which("astcenc"), "-cl", str(source), str(destination), "6x6", "-medium"],
        "bc7": [tool or shutil.which("texconv"), "-f", "BC7_UNORM", "-m", "0", "-o", str(destination.parent), str(source)],
    }
    command = commands.get(format_name)
    if not command or not command[0]:
        raise RuntimeError("no compressor is available for " + format_name)
    destination.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if result.returncode:
        raise RuntimeError(result.stdout[-3000:])
    return {"format": format_name, "output": str(destination), "tool": command[0]}


def main():
    parser = argparse.ArgumentParser(prog="asset_pipeline", description="Faoxom FBX conversion and mesh simplification tools")
    commands = parser.add_subparsers(dest="command", required=True)
    convert = commands.add_parser("fbx-convert")
    convert.add_argument("source")
    convert.add_argument("output")
    convert.add_argument("--blender")
    convert.add_argument("--scale", type=float, default=1.0)
    convert.add_argument("--ascii-only", action="store_true")
    simplify = commands.add_parser("simplify")
    simplify.add_argument("source")
    simplify.add_argument("output")
    simplify.add_argument("--target-ratio", type=float, required=True)
    lods = commands.add_parser("lod")
    lods.add_argument("source")
    lods.add_argument("output_directory")
    lods.add_argument("--ratios", default="1,0.5,0.25,0.125")
    validate = commands.add_parser("validate")
    validate.add_argument("source")
    manifest = commands.add_parser("manifest")
    manifest.add_argument("source")
    manifest.add_argument("output")
    resize = commands.add_parser("resize-texture")
    resize.add_argument("source")
    resize.add_argument("output")
    resize.add_argument("--width", type=int, required=True)
    resize.add_argument("--height", type=int, required=True)
    compress = commands.add_parser("compress-texture")
    compress.add_argument("source")
    compress.add_argument("output")
    compress.add_argument("--format", required=True, choices=["ktx2", "etc1s", "uastc", "astc", "bc7"])
    compress.add_argument("--tool")
    arguments = parser.parse_args()
    try:
        if arguments.command == "fbx-convert":
            result = convert_fbx(arguments.source, arguments.output, arguments.blender, arguments.scale, arguments.ascii_only)
        elif arguments.command == "simplify":
            result = simplify_file(arguments.source, arguments.output, arguments.target_ratio)
        elif arguments.command == "lod":
            ratios = [float(value) for value in arguments.ratios.split(",") if value.strip()]
            result = generate_lods(arguments.source, arguments.output_directory, ratios)
        elif arguments.command == "validate":
            result = validate_asset(arguments.source)
            if not result["valid"]:
                print(json.dumps(result, indent=2))
                return 2
        elif arguments.command == "manifest":
            result = build_manifest(arguments.source, arguments.output)
        elif arguments.command == "resize-texture":
            result = resize_texture(arguments.source, arguments.output, arguments.width, arguments.height)
        else:
            result = compress_texture(arguments.source, arguments.output, arguments.format, arguments.tool)
        print(json.dumps(result, indent=2))
    except Exception as error:
        print("asset_pipeline: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
