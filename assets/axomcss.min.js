!function(root){
"use strict";
const doc=root["document"];
const html=root["document"]?root["document"]["documentElement"]:null;
let foucstyle=null;
if(html){
html["classList"]["add"]("axom-loading");
try{
foucstyle=doc["createElement"]("style");
foucstyle["setAttribute"]("data-axom-fouc","");
foucstyle["textContent"]="html.axom-loading body{opacity:0 !important} html.axom-ready body{opacity:1;transition:opacity 120ms ease} html.axom-loading{overflow:hidden}";
(doc["head"]||html)["appendChild"](foucstyle);
}catch(err){}
}
const userconfig=root["axomcssConfig"]||{};
const breakpoints=root["Object"]["assign"]({sm:"640px",md:"768px",lg:"1024px",xl:"1280px","2xl":"1536px"},userconfig["breakpoints"]||{});
const containers=root["Object"]["assign"]({sm:"24rem",md:"28rem",lg:"32rem",xl:"36rem","2xl":"42rem"},userconfig["containers"]||{});
const rawcolors={slate:["#f8fafc","#f1f5f9","#e2e8f0","#cbd5e1","#94a3b8","#64748b","#475569","#334155","#1e293b","#0f172a","#020617"],gray:["#f9fafb","#f3f4f6","#e5e7eb","#d1d5db","#9ca3af","#6b7280","#4b5563","#374151","#1f2937","#111827","#030712"],zinc:["#fafafa","#f4f4f5","#e4e4e7","#d4d4d8","#a1a1aa","#71717a","#52525b","#3f3f46","#27272a","#18181b","#09090b"],neutral:["#fafafa","#f5f5f5","#e5e5e5","#d4d4d4","#a3a3a3","#737373","#525252","#404040","#262626","#171717","#0a0a0a"],stone:["#fafaf9","#f5f5f4","#e7e5e4","#d6d3d1","#a8a29e","#78716c","#57534e","#44403c","#292524","#1c1917","#0c0a09"],red:["#fef2f2","#fee2e2","#fecaca","#fca5a5","#f87171","#ef4444","#dc2626","#b91c1c","#991b1b","#7f1d1d","#450a0a"],orange:["#fff7ed","#ffedd5","#fed7aa","#fdba74","#fb923c","#f97316","#ea580c","#c2410c","#9a3412","#7c2d12","#431407"],amber:["#fffbeb","#fef3c7","#fde68a","#fcd34d","#fbbf24","#f59e0b","#d97706","#b45309","#92400e","#78350f","#451a03"],yellow:["#fefce8","#fef9c3","#fef08a","#fde047","#facc15","#eab308","#ca8a04","#a16207","#854d0e","#713f12","#422006"],lime:["#f7fee7","#ecfccb","#d9f99d","#bef264","#a3e635","#84cc16","#65a30d","#4d7c0f","#3f6212","#365314","#1a2e05"],green:["#f0fdf4","#dcfce7","#bbf7d0","#86efac","#4ade80","#22c55e","#16a34a","#15803d","#166534","#14532d","#052e16"],emerald:["#ecfdf5","#d1fae5","#a7f3d0","#6ee7b7","#34d399","#10b981","#059669","#047857","#065f46","#064e3b","#022c22"],teal:["#f0fdfa","#ccfbf1","#99f6e4","#5eead4","#2dd4bf","#14b8a6","#0d9488","#0f766e","#115e59","#134e4a","#042f2e"],cyan:["#ecfeff","#cffafe","#a5f3fc","#67e8f9","#22d3ee","#06b6d4","#0891b2","#0e7490","#155e75","#164e63","#083344"],sky:["#f0f9ff","#e0f2fe","#bae6fd","#7dd3fc","#38bdf8","#0ea5e9","#0284c7","#0369a1","#075985","#0c4a6e","#082f49"],blue:["#eff6ff","#dbeafe","#bfdbfe","#93c5fd","#60a5fa","#3b82f6","#2563eb","#1d4ed8","#1e40af","#1e3a8a","#172554"],indigo:["#eef2ff","#e0e7ff","#c7d2fe","#a5b4fc","#818cf8","#6366f1","#4f46e5","#4338ca","#3730a3","#312e81","#1e1b4b"],violet:["#f5f3ff","#ede9fe","#ddd6fe","#c4b5fd","#a78bfa","#8b5cf6","#7c3aed","#6d28d9","#5b21b6","#4c1d95","#2e1065"],purple:["#faf5ff","#f3e8ff","#e9d5ff","#d8b4fe","#c084fc","#a855f7","#9333ea","#7e22ce","#6b21a8","#581c87","#3b0764"],fuchsia:["#fdf4ff","#fae8ff","#f5d0fe","#f0abfc","#e879f9","#d946ef","#c026d3","#a21caf","#86198f","#701a75","#4a0d5c"],pink:["#fdf2f8","#fce7f3","#fbcfe8","#f9a8d4","#f472b6","#ec4899","#db2777","#be185d","#9d174d","#831843","#500724"],rose:["#fff1f2","#ffe4e6","#fecdd3","#fda4af","#fb7185","#f43f5e","#e11d48","#be123c","#9f1239","#881337","#4c0519"]};
const shades=[50,100,200,300,400,500,600,700,800,900,950];
const basecolors={black:"#000",white:"#fff",transparent:"transparent",current:"currentColor",inherit:"inherit"};
const colormap=new root["Map"]();
const injected=new root["Set"]();
const declcache=new root["Map"]();
const spacingcache=new root["Map"]();
const pendingcss=[];
let sheetbase=null;
let sheetdynamic=null;
let flushscheduled=false;
let observer=null;
let firstflushdone=false;
for(const cname in rawcolors){
const arr=rawcolors[cname];
for(let idx=0;idx<arr["length"];idx++)colormap["set"](cname+"-"+shades[idx],arr[idx]);
colormap["set"](cname,arr[5]);
}
for(const cname in basecolors)colormap["set"](cname,basecolors[cname]);
const numregex=/^\d+(\.\d+)?$/;
const fractionregex=/^\d+\/\d+$/;
const opacityregex=/\/(\d+|\[\d+(\.\d+)?%?\]|\[0?\.\d+\])$/;
const insetregex=/^(top|bottom|left|right|inset(-[xy])?)-(.+)$/;
const sizerregex=/^(w|h|min-w|min-h|max-w|max-h|size)-(.+)$/;
const paddingregex=/^p([tblrxyse]?)-(.+)$/;
const marginregex=/^(-?m)([tblrxyse]?)-(.+)$/;
const gapregex=/^gap-([xy])?-(.+)$/;
const gridcolsregex=/^grid-cols-(\d+)$/;
const gridrowsregex=/^grid-rows-(\d+)$/;
const colspansregex=/^col-span-(\d+)$/;
const rowspanregex=/^row-span-(\d+)$/;
const transformcomposed="translateX(var(--ax-tx,0)) translateY(var(--ax-ty,0)) translateZ(var(--ax-tz,0)) rotate(var(--ax-rot,0)) rotateX(var(--ax-rot-x,0)) rotateY(var(--ax-rot-y,0)) rotateZ(var(--ax-rot-z,0)) skewX(var(--ax-skew-x,0)) skewY(var(--ax-skew-y,0)) scaleX(var(--ax-sx,1)) scaleY(var(--ax-sy,1)) scaleZ(var(--ax-sz,1))";
const filtercomposed="var(--ax-blur,) var(--ax-brightness,) var(--ax-contrast,) var(--ax-grayscale,) var(--ax-hue-rotate,) var(--ax-invert,) var(--ax-saturate,) var(--ax-sepia,) var(--ax-drop-shadow,)";
const backdropcomposed="var(--ax-bd-blur,) var(--ax-bd-brightness,) var(--ax-bd-contrast,) var(--ax-bd-grayscale,) var(--ax-bd-hue-rotate,) var(--ax-bd-invert,) var(--ax-bd-opacity,) var(--ax-bd-saturate,) var(--ax-bd-sepia,)";
function escapeselector(str){return str["replace"](/([\\:.#[\]/%!(),@])/g,"\\$1");}
function parsearbitrary(str){
if(!str)return null;
if("["===str[0]&&"]"===str[str["length"]-1])return str["slice"](1,-1)["replace"](/_/g," ");
return null;
}
function parsespacing(str){
if(!str)return null;
const cached=spacingcache["get"](str);
if(void 0!==cached)return cached;
let out=null;
if("px"===str)out="1px";
else if("auto"===str)out="auto";
else if("full"===str)out="100%";
else if("screen"===str)out="100vh";
else if("svh"===str)out="100svh";
else if("dvh"===str)out="100dvh";
else if("lvh"===str)out="100lvh";
else if("min"===str)out="min-content";
else if("max"===str)out="max-content";
else if("fit"===str)out="fit-content";
else if("0"===str)out="0px";
else{
const arb=parsearbitrary(str);
if(arb)out=arb;
else if(numregex["test"](str))out=root["parseFloat"](str)*.25+"rem";
else if(fractionregex["test"](str)){
const parts=str["split"]("/").map(root["Number"]);
out=parts[1]>0?parts[0]/parts[1]*100+"%":null;
}
}
spacingcache["set"](str,out);
return out;
}
const fractionmap={"1/2":"50%","1/3":"33.333333%","2/3":"66.666667%","1/4":"25%","2/4":"50%","3/4":"75%","1/5":"20%","2/5":"40%","3/5":"60%","4/5":"80%","1/6":"16.666667%","5/6":"83.333333%","full":"100%"};
function parsecolor(str){
if(!str)return null;
if(colormap["has"](str))return colormap["get"](str);
const arb=parsearbitrary(str);
if(arb)return arb;
if("#"===str[0]||str["startsWith"]("rgb")||str["startsWith"]("hsl")||str["startsWith"]("oklch")||str["startsWith"]("color(")||str["startsWith"]("lab(")||str["startsWith"]("lch("))return str;
return null;
}
function parsecoloralpha(colorstr,op){
if(!colorstr||"transparent"===colorstr||"currentColor"===colorstr||"inherit"===colorstr)return colorstr;
if("#"===colorstr[0]&&7===colorstr["length"]&&null!=op){
const red=root["parseInt"](colorstr["slice"](1,3),16);
const green=root["parseInt"](colorstr["slice"](3,5),16);
const blue=root["parseInt"](colorstr["slice"](5,7),16);
return `rgba(${red},${green},${blue},${op/100})`;
}
return null!=op?`color-mix(in srgb, ${colorstr} ${op}%, transparent)`:colorstr;
}
function parsecolorwithopacity(str){
if(!str)return null;
const mat=str["match"](opacityregex);
const base=mat?str["slice"](0,str["length"]-mat[0]["length"]):str;
let op=null;
if(mat){
const val=mat[1];
if("["===val[0]){
const inner=val["slice"](1,-1);
op=inner["endsWith"]("%")?root["parseFloat"](inner):100*root["parseFloat"](inner);
}else op=root["Number"](val);
}
const col=parsecolor(base);
if(!col){
const arb=parsearbitrary(base);
if(arb)return {"color":arb,"opacity":op};
return null;
}
return {"color":col,"opacity":op};
}

function builddecl(cls,neg){
let mat;
if("["===cls[0]&&"]"===cls[cls["length"]-1]){
const inner=cls["slice"](1,-1);
const colon=inner["indexOf"](":");
if(colon>0){
const prop=inner["slice"](0,colon)["trim"]();
const val=inner["slice"](colon+1)["trim"]()["replace"](/_/g," ");
if(prop&&val){const obj={};obj[prop]=val;return obj;}
}
}
const displaymap={flex:"flex","inline-flex":"inline-flex",grid:"grid","inline-grid":"inline-grid",block:"block","inline-block":"inline-block",inline:"inline",hidden:"none",contents:"contents",table:"table","flow-root":"flow-root","list-item":"list-item"};
if(displaymap[cls])return {"display":displaymap[cls]};
const posmap={relative:"relative",absolute:"absolute",fixed:"fixed",sticky:"sticky",static:"static"};
if(posmap[cls])return {"position":posmap[cls]};
if("inset-0"===cls)return {"inset":"0"};
if("inset-auto"===cls)return {"inset":"auto"};
if(mat=cls["match"](insetregex)){
const side=mat[1];
const val=parsespacing(mat[4]);
if(null==val)return null;
const finalval=neg&&"auto"!==val?"-"+val:val;
if("inset"===side)return {"inset":finalval};
if("inset-x"===side)return {"left":finalval,"right":finalval};
if("inset-y"===side)return {"top":finalval,"bottom":finalval};
const obj={};obj[side]=finalval;return obj;
}
if(cls["startsWith"]("z-")){
const rawval=cls["slice"](2);
if(/^-?\d+$/.test(rawval))return {"z-index":rawval};
if("auto"===rawval)return {"z-index":"auto"};
const arb=parsearbitrary(rawval);
if(arb)return {"z-index":arb};
}
if(cls["startsWith"]("size-")){
const rawval=cls["slice"](5);
const val=parsespacing(rawval)||fractionmap[rawval]||parsearbitrary(rawval);
if(val)return {"width":val,"height":val};
}
if("flex-row"===cls)return {"flex-direction":"row"};
if("flex-row-reverse"===cls)return {"flex-direction":"row-reverse"};
if("flex-col"===cls)return {"flex-direction":"column"};
if("flex-col-reverse"===cls)return {"flex-direction":"column-reverse"};
if("flex-wrap"===cls)return {"flex-wrap":"wrap"};
if("flex-wrap-reverse"===cls)return {"flex-wrap":"wrap-reverse"};
if("flex-nowrap"===cls)return {"flex-wrap":"nowrap"};
if("flex-1"===cls)return {"flex":"1 1 0%"};
if("flex-auto"===cls)return {"flex":"1 1 auto"};
if("flex-initial"===cls)return {"flex":"0 1 auto"};
if("flex-none"===cls)return {"flex":"none"};
if(cls["startsWith"]("grow")){
const rawval="grow"===cls?"1":cls["slice"](5)||"1";
return {"flex-grow":rawval};
}
if(cls["startsWith"]("shrink")){
const rawval="shrink"===cls?"1":cls["slice"](7)||"1";
return {"flex-shrink":rawval};
}
if(cls["startsWith"]("basis-")){
const rawval=parsespacing(cls["slice"](6))||fractionmap[cls["slice"](6)]||parsearbitrary(cls["slice"](6));
if(rawval)return {"flex-basis":rawval};
}
if(cls["startsWith"]("order-")){
const rawval=cls["slice"](6);
const map={first:"-9999",last:"9999",none:"0"};
return {"order":map[rawval]||rawval};
}
if("items-start"===cls)return {"align-items":"flex-start"};
if("items-end"===cls)return {"align-items":"flex-end"};
if("items-center"===cls)return {"align-items":"center"};
if("items-baseline"===cls)return {"align-items":"baseline"};
if("items-stretch"===cls)return {"align-items":"stretch"};
if("justify-start"===cls)return {"justify-content":"flex-start"};
if("justify-end"===cls)return {"justify-content":"flex-end"};
if("justify-center"===cls)return {"justify-content":"center"};
if("justify-between"===cls)return {"justify-content":"space-between"};
if("justify-around"===cls)return {"justify-content":"space-around"};
if("justify-evenly"===cls)return {"justify-content":"space-evenly"};
if("justify-stretch"===cls)return {"justify-content":"stretch"};
if(mat=cls["match"](gapregex)){
const dir=mat[1];
const val=parsespacing(mat[2]);
if(!val)return null;
if("x"===dir)return {"column-gap":val};
if("y"===dir)return {"row-gap":val};
return {"gap":val};
}
if(mat=cls["match"](gridcolsregex))return {"grid-template-columns":`repeat(${mat[1]},minmax(0,1fr))`};
if("grid-cols-none"===cls)return {"grid-template-columns":"none"};
if("grid-cols-subgrid"===cls)return {"grid-template-columns":"subgrid"};
if(cls["startsWith"]("grid-cols-[")){
const rawval=parsearbitrary(cls["slice"](10));
if(rawval)return {"grid-template-columns":rawval};
}
if(mat=cls["match"](gridrowsregex))return {"grid-template-rows":`repeat(${mat[1]},minmax(0,1fr))`};
if("grid-rows-none"===cls)return {"grid-template-rows":"none"};
if("grid-rows-subgrid"===cls)return {"grid-template-rows":"subgrid"};
if(cls["startsWith"]("grid-rows-[")){
const rawval=parsearbitrary(cls["slice"](10));
if(rawval)return {"grid-template-rows":rawval};
}
if(mat=cls["match"](colspansregex))return {"grid-column":`span ${mat[1]}/span ${mat[1]}`};
if("col-span-full"===cls)return {"grid-column":"1/-1"};
if("col-span-auto"===cls)return {"grid-column":"auto"};
if(cls["startsWith"]("col-start-"))return {"grid-column-start":cls["slice"](10)};
if(cls["startsWith"]("col-end-"))return {"grid-column-end":cls["slice"](8)};
if(mat=cls["match"](rowspanregex))return {"grid-row":`span ${mat[1]}/span ${mat[1]}`};
if("row-span-full"===cls)return {"grid-row":"1/-1"};
if(cls["startsWith"]("row-start-"))return {"grid-row-start":cls["slice"](10)};
if(cls["startsWith"]("row-end-"))return {"grid-row-end":cls["slice"](8)};
if("auto-cols-auto"===cls)return {"grid-auto-columns":"auto"};
if("auto-cols-min"===cls)return {"grid-auto-columns":"min-content"};
if("auto-cols-max"===cls)return {"grid-auto-columns":"max-content"};
if("auto-cols-fr"===cls)return {"grid-auto-columns":"minmax(0,1fr)"};
if("auto-rows-auto"===cls)return {"grid-auto-rows":"auto"};
if("auto-rows-min"===cls)return {"grid-auto-rows":"min-content"};
if("auto-rows-max"===cls)return {"grid-auto-rows":"max-content"};
if("auto-rows-fr"===cls)return {"grid-auto-rows":"minmax(0,1fr)"};
if("grid-flow-row"===cls)return {"grid-auto-flow":"row"};
if("grid-flow-col"===cls)return {"grid-auto-flow":"column"};
if("grid-flow-dense"===cls)return {"grid-auto-flow":"dense"};
if("grid-flow-row-dense"===cls)return {"grid-auto-flow":"row dense"};
if("grid-flow-col-dense"===cls)return {"grid-auto-flow":"column dense"};
if(mat=cls["match"](sizerregex)){
const map={wid:"width",head:"height","min-w":"min-width","min-h":"min-height","max-w":"max-width","max-h":"max-height",size:"width"};
const prop=map[mat[1]];
let val=parsespacing(mat[2])||fractionmap[mat[2]];
if("screen"===mat[2]&&"w"===mat[1])val="100vw";
if("screen"===mat[2]&&"h"===mat[1])val="100vh";
if("svw"===mat[2])val="100svw";
if("lvw"===mat[2])val="100lvw";
if("dvw"===mat[2])val="100dvw";
if("svh"===mat[2])val="100svh";
if("dvh"===mat[2])val="100dvh";
if("lvh"===mat[2])val="100lvh";
if(!val){
const sm={xs:"20rem",sm:"24rem",md:"28rem",lg:"32rem",xl:"36rem","2xl":"42rem","3xl":"48rem","4xl":"56rem","5xl":"64rem","6xl":"72rem","7xl":"80rem",prose:"65ch","screen-sm":"640px","screen-md":"768px","screen-lg":"1024px","screen-xl":"1280px","screen-2xl":"1536px",full:"100%",min:"min-content",max:"max-content",fit:"fit-content",auto:"auto"};
if(sm[mat[2]])val=sm[mat[2]];
else{
const arb=parsearbitrary(mat[2]);
if(arb)val=arb;
}
}
if(val){
if("size"===mat[1])return {"width":val,"height":val};
const obj={};obj[prop]=val;return obj;
}
}
if("aspect-auto"===cls)return {"aspect-ratio":"auto"};
if("aspect-square"===cls)return {"aspect-ratio":"1/1"};
if("aspect-video"===cls)return {"aspect-ratio":"16/9"};
if(cls["startsWith"]("aspect-[")){
const rawval=parsearbitrary(cls["slice"](7));
if(rawval)return {"aspect-ratio":rawval};
}
if(cls["startsWith"]("columns-")){
const rawval=cls["slice"](8);
if("auto"===rawval)return {"columns":"auto"};
if(/^\d+$/.test(rawval))return {"columns":rawval};
const map={xs:"20rem",sm:"24rem",md:"28rem",lg:"32rem",xl:"36rem","2xl":"42rem","3xl":"48rem","4xl":"56rem","5xl":"64rem","6xl":"72rem","7xl":"80rem","3xs":"16rem","2xs":"18rem"};
if(map[rawval])return {"columns":map[rawval]};
const arb=parsearbitrary(rawval);
if(arb)return {"columns":arb};
}
if("break-normal"===cls)return {"overflow-wrap":"normal","word-break":"normal"};
if("break-words"===cls)return {"overflow-wrap":"break-word"};
if("break-all"===cls)return {"word-break":"break-all"};
if("break-keep"===cls)return {"word-break":"keep-all"};
if(mat=cls["match"](paddingregex)){
const dir=mat[1];
const val=parsespacing(mat[2]);
if(!val)return null;
if(!dir)return {"padding":val};
if("t"===dir)return {"padding-top":val};
if("b"===dir)return {"padding-bottom":val};
if("l"===dir)return {"padding-left":val};
if("r"===dir)return {"padding-right":val};
if("x"===dir)return {"padding-left":val,"padding-right":val};
if("y"===dir)return {"padding-top":val,"padding-bottom":val};
if("s"===dir)return {"padding-inline-start":val};
if("e"===dir)return {"padding-inline-end":val};
}
if(mat=cls["match"](marginregex)){
const isneg=mat[1];
const dir=mat[2];
const val=parsespacing(mat[3]);
if(!val)return null;
const finalval=("-"===isneg[0]||neg)&&"auto"!==val?"-"+val:val;
if(!dir)return {"margin":finalval};
if("t"===dir)return {"margin-top":finalval};
if("b"===dir)return {"margin-bottom":finalval};
if("l"===dir)return {"margin-left":finalval};
if("r"===dir)return {"margin-right":finalval};
if("x"===dir)return {"margin-left":finalval,"margin-right":finalval};
if("y"===dir)return {"margin-top":finalval,"margin-bottom":finalval};
if("s"===dir)return {"margin-inline-start":finalval};
if("e"===dir)return {"margin-inline-end":finalval};
}
if("m-auto"===cls)return {"margin":"auto"};
if("mx-auto"===cls)return {"margin-left":"auto","margin-right":"auto"};
if("my-auto"===cls)return {"margin-top":"auto","margin-bottom":"auto"};
if("ms-auto"===cls)return {"margin-inline-start":"auto"};
if("me-auto"===cls)return {"margin-inline-end":"auto"};
if(cls["startsWith"]("space-x-")){
const val=parsespacing(cls["slice"](8));
if(val)return {"child":`> :not([hidden])~:not([hidden]){--ax-space-xval-reverse:0;margin-right:calc(${val}*var(--ax-space-xval-reverse));margin-left:calc(${val}*calc(1 - var(--ax-space-xval-reverse)))}`};
}
if(cls["startsWith"]("space-y-")){
const val=parsespacing(cls["slice"](8));
if(val)return {"child":`> :not([hidden])~:not([hidden]){--ax-space-y-reverse:0;margin-bottom:calc(${val}*var(--ax-space-y-reverse));margin-top:calc(${val}*calc(1 - var(--ax-space-y-reverse)))}`};
}
if("space-x-reverse"===cls)return {"child":"> :not([hidden])~:not([hidden]){--ax-space-x-reverse:1}"};
if("space-y-reverse"===cls)return {"child":"> :not([hidden])~:not([hidden]){--ax-space-y-reverse:1}"};
if(cls["startsWith"]("divide-x")){
const num=cls["match"](/^divide-x-(\d+)$/);
const wid=num?num[1]+"px":"1px";
if("divide-x"===cls||num)return {"child":`> :not([hidden])~:not([hidden]){--ax-divide-xval-reverse:0;border-right-width:calc(${wid}*var(--ax-divide-xval-reverse));border-left-width:calc(${wid}*calc(1 - var(--ax-divide-xval-reverse)))}`};
}
if(cls["startsWith"]("divide-y")){
const num=cls["match"](/^divide-y-(\d+)$/);
const wid=num?num[1]+"px":"1px";
if("divide-y"===cls||num)return {"child":`> :not([hidden])~:not([hidden]){--ax-divide-y-reverse:0;border-top-width:calc(${wid}*calc(1 - var(--ax-divide-y-reverse)));border-bottom-width:calc(${wid}*var(--ax-divide-y-reverse))}`} ;
}
if(cls["startsWith"]("divide-")){
const col=parsecolor(cls["slice"](7));
if(col)return {"child":`> :not([hidden])~:not([hidden]){border-color:${col}}`};
if(["solid","dashed","dotted","double","none"]["includes"](cls["slice"](7)))return {"child":`> :not([hidden])~:not([hidden]){border-style:${cls["slice"](7)}}`};
}
if("text-left"===cls)return {"text-align":"left"};
if("text-center"===cls)return {"text-align":"center"};
if("text-right"===cls)return {"text-align":"right"};
if("text-justify"===cls)return {"text-align":"justify"};
if("text-start"===cls)return {"text-align":"start"};
if("text-end"===cls)return {"text-align":"end"};
if("text-balance"===cls)return {"text-wrap":"balance"};
if("text-pretty"===cls)return {"text-wrap":"pretty"};
if("text-wrap"===cls)return {"text-wrap":"wrap"};
if("text-nowrap"===cls)return {"text-wrap":"nowrap"};
if("text-ellipsis"===cls)return {"text-overflow":"ellipsis"};
if("text-clip"===cls)return {"text-overflow":"clip"};
if("uppercase"===cls)return {"text-transform":"uppercase"};
if("lowercase"===cls)return {"text-transform":"lowercase"};
if("capitalize"===cls)return {"text-transform":"capitalize"};
if("normal-case"===cls)return {"text-transform":"none"};
if("truncate"===cls)return {"overflow":"hidden","text-overflow":"ellipsis","white-space":"nowrap"};
if("antialiased"===cls)return {"-webkit-font-smoothing":"antialiased","-moz-osx-font-smoothing":"grayscale"};
if("subpixel-antialiased"===cls)return {"-webkit-font-smoothing":"auto","-moz-osx-font-smoothing":"auto"};
if(cls["startsWith"]("text-")){
const rawval=cls["slice"](5);
const sizemap={xs:["0.75rem","1rem"],sm:["0.875rem","1.25rem"],base:["1rem","1.5rem"],lg:["1.125rem","1.75rem"],xl:["1.25rem","1.75rem"],"2xl":["1.5rem","2rem"],"3xl":["1.875rem","2.25rem"],"4xl":["2.25rem","2.5rem"],"5xl":["3rem","1"],"6xl":["3.75rem","1"],"7xl":["4.5rem","1"],"8xl":["6rem","1"],"9xl":["8rem","1"]};
if(sizemap[rawval])return {"font-size":sizemap[rawval][0],"line-height":sizemap[rawval][1]};
if("transparent"===rawval)return {"color":"transparent"};
const parsed=parsecolorwithopacity(rawval);
if(parsed)return {"color":null!=parsed["opacity"]?parsecoloralpha(parsed["color"],parsed["opacity"]):parsed["color"]};
const arb=parsearbitrary(rawval);
if(arb)return {"font-size":arb};
}
if(cls["startsWith"]("font-")){
const rawval=cls["slice"](5);
const wmap={thin:100,extralight:200,light:300,normal:400,medium:500,semibold:600,bold:700,extrabold:800,black:900};
if(null!=wmap[rawval])return {"font-weight":wmap[rawval]};
if("sans"===rawval)return {"font-family":"ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif"};
if("serif"===rawval)return {"font-family":"ui-serif,Georgia,Cambria,Times New Roman,Times,serif"};
if("mono"===rawval)return {"font-family":"ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace"};
const arb=parsearbitrary(rawval);
if(arb)return {"font-family":arb};
}
if(cls["startsWith"]("leading-")){
const rawval=cls["slice"](8);
const map={none:"1",tight:"1.25",snug:"1.375",normal:"1.5",relaxed:"1.625",loose:"2"};
if(map[rawval])return {"line-height":map[rawval]};
const val=parsespacing(rawval);
if(val)return {"line-height":val};
}
if(cls["startsWith"]("tracking-")){
const rawval=cls["slice"](9);
const map={tighter:"-0.05em",tight:"-0.025em",normal:"0em",wide:"0.025em",wider:"0.05em",widest:"0.1em"};
if(map[rawval])return {"letter-spacing":map[rawval]};
}
if("italic"===cls)return {"font-style":"italic"};
if("not-italic"===cls)return {"font-style":"normal"};
if("underline"===cls)return {"text-decoration-line":"underline"};
if("overline"===cls)return {"text-decoration-line":"overline"};
if("line-through"===cls)return {"text-decoration-line":"line-through"};
if("no-underline"===cls)return {"text-decoration-line":"none"};
if(cls["startsWith"]("decoration-")){
const rawval=cls["slice"](11);
const col=parsecolor(rawval);
if(col)return {"text-decoration-color":col};
const thick={auto:"auto","from-font":"from-font",0:"0px",1:"1px",2:"2px",4:"4px",8:"8px"};
if(thick[rawval])return {"text-decoration-thickness":thick[rawval]};
if(["solid","double","dotted","dashed","wavy"]["includes"](rawval))return {"text-decoration-style":rawval};
const arb=parsearbitrary(rawval);
if(arb)return {"text-decoration-color":arb};
}
if(cls["startsWith"]("underline-offset-")){
const rawval=cls["slice"](17);
const map={auto:"auto",0:"0px",1:"1px",2:"2px",4:"4px",8:"8px"};
if(map[rawval])return {"text-underline-offset":map[rawval]};
const arb=parsearbitrary(rawval);
if(arb)return {"text-underline-offset":arb};
}
if(cls["startsWith"]("line-clamp-")){
const rawval=cls["slice"](11);
if("none"===rawval)return {"overflow":"visible","display":"block","-webkit-box-orient":"horizontal","-webkit-line-clamp":"none"};
return {"overflow":"hidden","display":"-webkit-box","-webkit-box-orient":"vertical","-webkit-line-clamp":rawval};
}
if(cls["startsWith"]("indent-")){
const rawval=cls["slice"](7);
const val=parsespacing(rawval);
if(val)return {"text-indent":val};
const arb=parsearbitrary(rawval);
if(arb)return {"text-indent":arb};
}
if(cls["startsWith"]("align-")){
const map={baseline:"baseline",top:"top",middle:"middle",bottom:"bottom","text-top":"text-top","text-bottom":"text-bottom",sub:"sub",super:"super"};
const rawval=cls["slice"](6);
if(map[rawval])return {"vertical-align":map[rawval]};
}
if(cls["startsWith"]("whitespace-")){
const map={normal:"normal",nowrap:"nowrap",pre:"pre","pre-line":"pre-line","pre-wrap":"pre-wrap","break-spaces":"break-spaces"};
const rawval=cls["slice"](11);
if(map[rawval])return {"white-space":map[rawval]};
}
if(cls["startsWith"]("hyphens-")){
const rawval=cls["slice"](8);
if(["none","manual","auto"]["includes"](rawval))return {"hyphens":rawval};
}
if("content-none"===cls)return {"content":"none"};
if(cls["startsWith"]("content-[")){
const rawval=parsearbitrary(cls["slice"](8));
if(rawval)return {"content":rawval};
}
if(["normal-nums","ordinal","slashed-zero","lining-nums","oldstyle-nums","proportional-nums","tabular-nums","diagonal-fractions","stacked-fractions"]["includes"](cls)){
if("normal-nums"===cls)return {"font-variant-numeric":"normal"};
return {"font-variant-numeric":cls};
}
if("bg-clip-text"===cls)return {"-webkit-background-clip":"text","background-clip":"text"};
if("bg-clip-border"===cls)return {"-webkit-background-clip":"border-box","background-clip":"border-box"};
if("bg-clip-padding"===cls)return {"-webkit-background-clip":"padding-box","background-clip":"padding-box"};
if("bg-clip-content"===cls)return {"-webkit-background-clip":"content-box","background-clip":"content-box"};
if(cls["startsWith"]("bg-")){
const rawval=cls["slice"](3);
if("none"===rawval)return {"background-image":"none"};
if("fixed"===rawval)return {"background-attachment":"fixed"};
if("local"===rawval)return {"background-attachment":"local"};
if("scroll"===rawval)return {"background-attachment":"scroll"};
if("center"===rawval)return {"background-position":"center"};
if("top"===rawval)return {"background-position":"top"};
if("bottom"===rawval)return {"background-position":"bottom"};
if("left"===rawval)return {"background-position":"left"};
if("right"===rawval)return {"background-position":"right"};
if("cover"===rawval)return {"background-size":"cover"};
if("contain"===rawval)return {"background-size":"contain"};
if("auto"===rawval)return {"background-size":"auto"};
if("no-repeat"===rawval)return {"background-repeat":"no-repeat"};
if("repeat"===rawval)return {"background-repeat":"repeat"};
if("repeat-x"===rawval)return {"background-repeat":"repeat-x"};
if("repeat-y"===rawval)return {"background-repeat":"repeat-y"};
if("repeat-round"===rawval)return {"background-repeat":"round"};
if("repeat-space"===rawval)return {"background-repeat":"space"};
if("origin-border"===rawval)return {"background-origin":"border-box"};
if("origin-padding"===rawval)return {"background-origin":"padding-box"};
if("origin-content"===rawval)return {"background-origin":"content-box"};
if(rawval["startsWith"]("gradient-to-")){
const map={tmp:"to top",tr:"to top right",res:"to right",br:"to bottom right",bool:"to bottom",bl:"to bottom left",list:"to left",tl:"to top left"};
const dir=rawval["replace"]("gradient-to-","");
if(map[dir])return {"background-image":`linear-gradient(${map[dir]},var(--ax-gs,transparent),var(--ax-gm,transparent),var(--ax-ge,transparent))`};
}
if("gradient-radial"===rawval)return {"background-image":"radial-gradient(var(--ax-gs,transparent),var(--ax-gm,transparent),var(--ax-ge,transparent))"};
if("gradient-conic"===rawval)return {"background-image":"conic-gradient(var(--ax-gs,transparent),var(--ax-gm,transparent),var(--ax-ge,transparent))"};
const arb=parsearbitrary(rawval);
if(arb)return {"background-image":arb};
if("["===rawval[0]&&"]"===rawval[rawval["length"]-1])return {"background-color":rawval["slice"](1,-1)};
const parsed=parsecolorwithopacity(rawval);
if(parsed)return {"background-color":null!=parsed["opacity"]?parsecoloralpha(parsed["color"],parsed["opacity"]):parsed["color"]};
}
if(cls["startsWith"]("from-")){
const col=parsecolor(cls["slice"](5))||parsearbitrary(cls["slice"](5));
if(col)return {"--ax-gs":col};
}
if(cls["startsWith"]("via-")){
const col=parsecolor(cls["slice"](4))||parsearbitrary(cls["slice"](4));
if(col)return {"--ax-gm":col};
}
if(cls["startsWith"]("to-")){
const col=parsecolor(cls["slice"](3))||parsearbitrary(cls["slice"](3));
if(col)return {"--ax-ge":col};
}
if(/^border(-[xy])?(-\d+)?$/.test(cls)||"border"===cls){
const mat2=cls["match"](/^border(?:-([xysle]))?(?:-(\d+))?$/);
if(mat2){
const dir=mat2[1];
const wid=mat2[2]?mat2[2]+"px":"1px";
if(!dir)return {"border-width":wid};
if("x"===dir)return {"border-left-width":wid,"border-right-width":wid};
if("y"===dir)return {"border-top-width":wid,"border-bottom-width":wid};
if("s"===dir)return {"border-inline-start-width":wid};
if("e"===dir)return {"border-inline-end-width":wid};
const map={tmp:"border-top-width",bool:"border-bottom-width",list:"border-left-width",res:"border-right-width"};
if(map[dir]){const obj={};obj[map[dir]]=wid;return obj;}
}
}
if(cls["startsWith"]("border-")){
const rawval=cls["slice"](7);
const parsed=parsecolorwithopacity(rawval);
if(parsed)return {"border-color":null!=parsed["opacity"]?parsecoloralpha(parsed["color"],parsed["opacity"]):parsed["color"]};
if(["solid","dashed","dotted","double","hidden","none"]["includes"](rawval))return {"border-style":rawval};
if("collapse"===rawval)return {"border-collapse":"collapse"};
if("separate"===rawval)return {"border-collapse":"separate"};
if(rawval["startsWith"]("spacing-")){
const val=parsespacing(rawval["slice"](8));
if(val)return {"border-spacing":val};
}
if(rawval["startsWith"]("spacing-x-")){
const val=parsespacing(rawval["slice"](10));
if(val)return {"border-spacing":`${val} 0`};
}
if(rawval["startsWith"]("spacing-y-")){
const val=parsespacing(rawval["slice"](10));
if(val)return {"border-spacing":`0 ${val}`};
}
}
if("rounded"===cls)return {"border-radius":"0.25rem"};
if(cls["startsWith"]("rounded-")){
const rawval=cls["slice"](8);
const mat2=rawval["match"](/^(t|b|l|r|tl|tr|bl|br|s|e|ss|se|es|ee)-(.+)$/);
if(mat2){
const side=mat2[1];
const size=mat2[2];
const map={none:"0px",sm:"0.125rem",defaultsize:"0.25rem",md:"0.375rem",lg:"0.5rem",xl:"0.75rem","2xl":"1rem","3xl":"1.5rem",full:"9999px"};
const rad=map[size]||parsearbitrary(size);
if(!rad)return null;
const sidemap={tmp:["border-top-left-radius","border-top-right-radius"],bool:["border-bottom-left-radius","border-bottom-right-radius"],list:["border-top-left-radius","border-bottom-left-radius"],res:["border-top-right-radius","border-bottom-right-radius"],tl:["border-top-left-radius"],tr:["border-top-right-radius"],bl:["border-bottom-left-radius"],br:["border-bottom-right-radius"],"s":["border-start-start-radius","border-end-start-radius"],err:["border-start-end-radius","border-end-end-radius"],ss:["border-start-start-radius"],se:["border-start-end-radius"],es:["border-end-start-radius"],ee:["border-end-end-radius"]};
const obj={};
(sidemap[side]||[])["forEach"](prop=>obj[prop]=rad);
return obj;
}
const map={none:"0px",sm:"0.125rem",defaultsize:"0.25rem",md:"0.375rem",lg:"0.5rem",xl:"0.75rem","2xl":"1rem","3xl":"1.5rem",full:"9999px"};
if(map[rawval])return {"border-radius":map[rawval]};
const arb=parsearbitrary(rawval);
if(arb)return {"border-radius":arb};
}
if("shadow"===cls)return {"box-shadow":"0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px -1px rgba(0,0,0,0.1)","--ax-shadow":"0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px -1px rgba(0,0,0,0.1)"};
if(cls["startsWith"]("shadow-")){
const rawval=cls["slice"](7);
const map={sm:"0 1px 2px 0 rgba(0,0,0,0.05)",defaultsize:"0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px -1px rgba(0,0,0,0.1)",md:"0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1)",lg:"0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1)",xl:"0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1)","2xl":"0 25px 50px -12px rgba(0,0,0,0.25)",inner:"inset 0 2px 4px 0 rgba(0,0,0,0.05)",none:"none"};
if(map[rawval])return {"box-shadow":map[rawval],"--ax-shadow":map[rawval]};
if(rawval["startsWith"]("inset-")){
const inner=rawval["slice"](6);
if(map[inner])return {"box-shadow":`inset ${map[inner]}`,"--ax-shadow":`inset ${map[inner]}`};
const arb=parsearbitrary(inner);
if(arb)return {"box-shadow":`inset ${arb}`,"--ax-shadow":`inset ${arb}`};
}
const arb=parsearbitrary(rawval);
if(arb)return {"box-shadow":arb,"--ax-shadow":arb};
const col=parsecolor(rawval);
if(col)return {"--ax-shadow-color":col};
const parsed=parsecolorwithopacity(rawval);
if(parsed)return {"--ax-shadow-color":null!=parsed["opacity"]?parsecoloralpha(parsed["color"],parsed["opacity"]):parsed["color"]};
}
if(cls["startsWith"]("opacity-")){
const rawval=cls["slice"](8);
if(/^\d+$/.test(rawval))return {"opacity":root["Number"](rawval)/100};
const arb=parsearbitrary(rawval);
if(arb)return {"opacity":arb};
}
if("outline-none"===cls)return {"outline":"2px solid transparent","outline-offset":"2px"};
if(cls["startsWith"]("outline-")){
const rawval=cls["slice"](8);
if(/^\d+$/.test(rawval))return {"outline":`${rawval}px solid currentColor`,"outline-offset":"0px"};
if(rawval["startsWith"]("offset-")){
const inner=rawval["slice"](7);
const map={0:"0px",1:"1px",2:"2px",4:"4px",8:"8px"};
if(map[inner])return {"outline-offset":map[inner]};
const arb=parsearbitrary(inner);
if(arb)return {"outline-offset":arb};
}
const col=parsecolor(rawval);
if(col)return {"outline-color":col};
if(["solid","dashed","dotted","double"]["includes"](rawval))return {"outline-style":rawval};
}
if("ring"===cls)return {"--ax-ring-shadow":"0 0 0 3px var(--ax-ring-color,rgba(59,130,246,0.5))","box-shadow":"var(--ax-ring-offset-shadow,0 0 #0000),var(--ax-ring-shadow,0 0 #0000),var(--ax-shadow,0 0 #0000)"};
if(cls["startsWith"]("ring-")){
const rawval=cls["slice"](5);
if(/^\d+$/.test(rawval))return {"--ax-ring-shadow":`0 0 0 ${rawval}px var(--ax-ring-color,rgba(59,130,246,0.5))`,"box-shadow":"var(--ax-ring-offset-shadow,0 0 #0000),var(--ax-ring-shadow,0 0 #0000),var(--ax-shadow,0 0 #0000)"};
if(rawval["startsWith"]("offset-")){
const inner=rawval["slice"](7);
if(/^\d+$/.test(inner))return {"--ax-ring-offset-width":inner+"px","--ax-ring-offset-shadow":`0 0 0 var(--ax-ring-offset-width) var(--ax-ring-offset-color,#fff)`};
const col=parsecolor(inner);
if(col)return {"--ax-ring-offset-color":col,"--ax-ring-offset-shadow":`0 0 0 var(--ax-ring-offset-width,0px) var(--ax-ring-offset-color)`};
}
if("inset"===rawval)return {"--ax-ring-inset":"inset"};
const col=parsecolor(rawval)||parsearbitrary(rawval);
if(col)return {"--ax-ring-color":col};
const parsed=parsecolorwithopacity(rawval);
if(parsed)return {"--ax-ring-color":null!=parsed["opacity"]?parsecoloralpha(parsed["color"],parsed["opacity"]):parsed["color"]};
}
if(cls["startsWith"]("cursor-")){
const rawval=cls["slice"](7);
const map={auto:"auto",default:"default",pointer:"pointer",wait:"wait",text:"text",move:"move",help:"help","not-allowed":"not-allowed",none:"none","context-menu":"context-menu",progress:"progress",cell:"cell",crosshair:"crosshair","vertical-text":"vertical-text",alias:"alias",copy:"copy","no-drop":"no-drop",grab:"grab",grabbing:"grabbing","all-scroll":"all-scroll","col-resize":"col-resize","row-resize":"row-resize","n-resize":"n-resize","e-resize":"e-resize","s-resize":"s-resize","w-resize":"w-resize","ne-resize":"ne-resize","nw-resize":"nw-resize","se-resize":"se-resize","sw-resize":"sw-resize","ew-resize":"ew-resize","ns-resize":"ns-resize","nesw-resize":"nesw-resize","nwse-resize":"nwse-resize","zoom-in":"zoom-in","zoom-out":"zoom-out"};
if(map[rawval])return {"cursor":map[rawval]};
const arb=parsearbitrary(rawval);
if(arb)return {"cursor":arb};
}
if("select-none"===cls)return {"user-select":"none"};
if("select-text"===cls)return {"user-select":"text"};
if("select-all"===cls)return {"user-select":"all"};
if("select-auto"===cls)return {"user-select":"auto"};
if("pointer-events-none"===cls)return {"pointer-events":"none"};
if("pointer-events-auto"===cls)return {"pointer-events":"auto"};
if("overflow-hidden"===cls)return {"overflow":"hidden"};
if("overflow-auto"===cls)return {"overflow":"auto"};
if("overflow-visible"===cls)return {"overflow":"visible"};
if("overflow-scroll"===cls)return {"overflow":"scroll"};
if("overflow-clip"===cls)return {"overflow":"clip"};
if(cls["startsWith"]("overflow-")){
const rawval=cls["slice"](9);
if(rawval["startsWith"]("x-")||rawval["startsWith"]("y-")){
const parts=rawval["split"]("-");
const dir=parts[0];
const val=parts[1];
if(["hidden","auto","visible","scroll","clip"]["includes"](val))return {[`overflow-${dir}`]:val};
}
}
if(cls["startsWith"]("overscroll-")){
const rawval=cls["slice"](11);
if(["auto","contain","none"]["includes"](rawval))return {"overscroll-behavior":rawval};
if(rawval["startsWith"]("x-")||rawval["startsWith"]("y-")){
const parts=rawval["split"]("-");
const dir=parts[0];
const val=parts[1];
if(["auto","contain","none"]["includes"](val))return {[`overscroll-behavior-${dir}`]:val};
}
}
if("scroll-auto"===cls)return {"scroll-behavior":"auto"};
if("scroll-smooth"===cls)return {"scroll-behavior":"smooth"};
if(cls["startsWith"]("scroll-m")){
const mat2=cls["match"](/^scroll-m([tblrxyse]?)-(.+)$/);
if(mat2){
const dir=mat2[1];
const val=parsespacing(mat2[2]);
if(!val)return null;
if(!dir)return {"scroll-margin":val};
if("t"===dir)return {"scroll-margin-top":val};
if("b"===dir)return {"scroll-margin-bottom":val};
if("l"===dir)return {"scroll-margin-left":val};
if("r"===dir)return {"scroll-margin-right":val};
if("x"===dir)return {"scroll-margin-left":val,"scroll-margin-right":val};
if("y"===dir)return {"scroll-margin-top":val,"scroll-margin-bottom":val};
if("s"===dir)return {"scroll-margin-inline-start":val};
if("e"===dir)return {"scroll-margin-inline-end":val};
}
const mat3=cls["match"](/^scroll-p([tblrxyse]?)-(.+)$/);
if(mat3){
const dir=mat3[1];
const val=parsespacing(mat3[2]);
if(!val)return null;
if(!dir)return {"scroll-padding":val};
if("t"===dir)return {"scroll-padding-top":val};
if("b"===dir)return {"scroll-padding-bottom":val};
if("l"===dir)return {"scroll-padding-left":val};
if("r"===dir)return {"scroll-padding-right":val};
if("x"===dir)return {"scroll-padding-left":val,"scroll-padding-right":val};
if("y"===dir)return {"scroll-padding-top":val,"scroll-padding-bottom":val};
if("s"===dir)return {"scroll-padding-inline-start":val};
if("e"===dir)return {"scroll-padding-inline-end":val};
}
}
if("snap-start"===cls)return {"scroll-snap-align":"start"};
if("snap-end"===cls)return {"scroll-snap-align":"end"};
if("snap-center"===cls)return {"scroll-snap-align":"center"};
if("snap-align-none"===cls)return {"scroll-snap-align":"none"};
if("snap-normal"===cls)return {"scroll-snap-stop":"normal"};
if("snap-always"===cls)return {"scroll-snap-stop":"always"};
if("snap-none"===cls)return {"scroll-snap-type":"none"};
if("snap-x"===cls)return {"scroll-snap-type":"x var(--ax-scroll-snap-strictness,proximity)"};
if("snap-y"===cls)return {"scroll-snap-type":"y var(--ax-scroll-snap-strictness,proximity)"};
if("snap-both"===cls)return {"scroll-snap-type":"both var(--ax-scroll-snap-strictness,proximity)"};
if("snap-mandatory"===cls)return {"--ax-scroll-snap-strictness":"mandatory"};
if("snap-proximity"===cls)return {"--ax-scroll-snap-strictness":"proximity"};
if(cls["startsWith"]("object-")){
const rawval=cls["slice"](7);
if(["contain","cover","fill","none","scale-down"]["includes"](rawval))return {"object-fit":rawval};
const map={bottom:"bottom",center:"center",left:"left","left-bottom":"left bottom","left-top":"left top",right:"right","right-bottom":"right bottom","right-top":"right top",top:"top"};
if(map[rawval])return {"object-position":map[rawval]};
}
if("transition"===cls)return {"transition":"color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter 150ms cubic-bezier(0.4,0,0.2,1)"};
if("transition-all"===cls)return {"transition":"all 150ms cubic-bezier(0.4,0,0.2,1)"};
if("transition-none"===cls)return {"transition":"none"};
if(cls["startsWith"]("transition-")){
const map={colors:"color,background-color,border-color,text-decoration-color,fill,stroke",opacity:"opacity",shadow:"box-shadow",transform:"transform"};
const rawval=cls["slice"](11);
if(map[rawval])return {"transition":`${map[rawval]} 150ms cubic-bezier(0.4,0,0.2,1)`};
}
if(cls["startsWith"]("duration-")){
const rawval=cls["slice"](9);
if(/^\d+$/.test(rawval))return {"transition-duration":rawval+"ms"};
const arb=parsearbitrary(rawval);
if(arb)return {"transition-duration":arb};
}
if(cls["startsWith"]("delay-")){
const rawval=cls["slice"](6);
if(/^\d+$/.test(rawval))return {"transition-delay":rawval+"ms"};
const arb=parsearbitrary(rawval);
if(arb)return {"transition-delay":arb};
}
if(cls["startsWith"]("ease-")){
const rawval=cls["slice"](5);
const map={linear:"linear",in:"cubic-bezier(0.4,0,1,1)",out:"cubic-bezier(0,0,0.2,1)","in-out":"cubic-bezier(0.4,0,0.2,1)"};
if(map[rawval])return {"transition-timing-function":map[rawval]};
const arb=parsearbitrary(rawval);
if(arb)return {"transition-timing-function":arb};
}
if("transform"===cls)return {"transform":transformcomposed};
if("transform-gpu"===cls)return {"transform":transformcomposed};
if("transform-none"===cls)return {"transform":"none"};
if("transform-3d"===cls)return {"transform-style":"preserve-3d"};
if(cls["startsWith"]("origin-")){
const rawval=cls["slice"](7);
const map={center:"center",top:"top","top-right":"top right",right:"right","bottom-right":"bottom right",bottom:"bottom","bottom-left":"bottom left",left:"left","top-left":"top left"};
if(map[rawval])return {"transform-origin":map[rawval]};
const arb=parsearbitrary(rawval);
if(arb)return {"transform-origin":arb};
}
if(cls["startsWith"]("perspective-")){
const rawval=cls["slice"](12);
const map={none:"none",dramatic:"500px",near:"750px",normal:"1000px",mid:"1500px",far:"2500px"};
if(map[rawval])return {"perspective":map[rawval]};
const arb=parsearbitrary(rawval);
if(arb)return {"perspective":arb};
}
if(cls["startsWith"]("perspective-origin-")){
const rawval=cls["slice"](19);
const arb=parsearbitrary(rawval);
if(arb)return {"perspective-origin":arb};
return {"perspective-origin":rawval["replace"](/_/g," ")};
}
if(cls["startsWith"]("scale-")){
const mat2=cls["match"](/^scale-([xyz])?-(.+)$/);
if(mat2){
const axis=mat2[1];
const raw=mat2[2];
let num=null;
if(/^\d+$/.test(raw))num=root["Number"](raw)/100;
else{
const arb=parsearbitrary(raw);
if(arb)num=arb;
}
if(null!=num){
if(!axis)return {"--ax-sx":num,"--ax-sy":num,"transform":transformcomposed};
if("x"===axis)return {"--ax-sx":num,"transform":transformcomposed};
if("y"===axis)return {"--ax-sy":num,"transform":transformcomposed};
if("z"===axis)return {"--ax-sz":num,"transform":transformcomposed};
}
}
}
if(cls["startsWith"]("rotate-")){
const mat2=cls["match"](/^rotate-(-?\d+)$/);
if(mat2)return {"--ax-rot":`${mat2[1]}deg`,"transform":transformcomposed};
if(cls["startsWith"]("rotate-x-")){
const rawval=cls["slice"](9);
if(/^-?\d+$/.test(rawval))return {"--ax-rot-x":`${rawval}deg`,"transform":transformcomposed};
}
if(cls["startsWith"]("rotate-y-")){
const rawval=cls["slice"](9);
if(/^-?\d+$/.test(rawval))return {"--ax-rot-y":`${rawval}deg`,"transform":transformcomposed};
}
if(cls["startsWith"]("rotate-z-")){
const rawval=cls["slice"](9);
if(/^-?\d+$/.test(rawval))return {"--ax-rot-z":`${rawval}deg`,"transform":transformcomposed};
}
if(cls["startsWith"]("rotate-[")){
const arb=parsearbitrary(cls["slice"](7));
if(arb)return {"--ax-rot":arb,"transform":transformcomposed};
}
}
if(cls["startsWith"]("translate-")){
const mat2=cls["match"](/^translate-([xyz])-(.+)$/);
if(mat2){
const axis=mat2[1];
const val=parsespacing(mat2[2]);
if(!val)return null;
if("x"===axis)return {"--ax-tx":val,"transform":transformcomposed};
if("y"===axis)return {"--ax-ty":val,"transform":transformcomposed};
if("z"===axis)return {"--ax-tz":val,"transform":transformcomposed};
}
}
if(cls["startsWith"]("skew-")){
const mat2=cls["match"](/^skew-([xy])-(-?\d+)$/);
if(mat2){
if("x"===mat2[1])return {"--ax-skew-x":`${mat2[2]}deg`,"transform":transformcomposed};
if("y"===mat2[1])return {"--ax-skew-y":`${mat2[2]}deg`,"transform":transformcomposed};
}
}
if("backface-visible"===cls)return {"backface-visibility":"visible"};
if("backface-hidden"===cls)return {"backface-visibility":"hidden"};
if("preserve-3d"===cls)return {"transform-style":"preserve-3d"};
if("flat"===cls)return {"transform-style":"flat"};
if(cls["startsWith"]("blur")){
const raw="blur"===cls?"8px":cls["slice"](5)||"8px";
const map={none:"0",sm:"4px",defaultsize:"8px",md:"12px",lg:"16px",xl:"24px","2xl":"40px","3xl":"64px"};
const val=map[raw]||parsearbitrary(raw);
if(val)return {"--ax-blur":`blur(${val})`,"filter":filtercomposed};
}
if(cls["startsWith"]("brightness-")){
const rawval=cls["slice"](11);
const map={0:"0",50:".5",75:".75",90:".9",95:".95",100:"1",105:"1.05",110:"1.1",125:"1.25",150:"1.5",200:"2"};
const val=map[rawval]||parsearbitrary(rawval);
if(val)return {"--ax-brightness":`brightness(${val})`,"filter":filtercomposed};
}
if(cls["startsWith"]("contrast-")){
const rawval=cls["slice"](9);
const map={0:"0",50:".5",75:".75",100:"1",125:"1.25",150:"1.5",200:"2"};
const val=map[rawval]||parsearbitrary(rawval);
if(val)return {"--ax-contrast":`contrast(${val})`,"filter":filtercomposed};
}
if(cls["startsWith"]("saturate-")){
const rawval=cls["slice"](9);
const map={0:"0",50:".5",100:"1",150:"1.5",200:"2"};
const val=map[rawval]||parsearbitrary(rawval);
if(val)return {"--ax-saturate":`saturate(${val})`,"filter":filtercomposed};
}
if(cls["startsWith"]("grayscale")){
const raw="grayscale"===cls?"100%":cls["slice"](10)||"100%";
const map={0:"0",defaultsize:"100%"};
const val=map[raw]||parsearbitrary(raw)||raw;
if(val)return {"--ax-grayscale":`grayscale(${val})`,"filter":filtercomposed};
}
if(cls["startsWith"]("invert")){
const raw="invert"===cls?"100%":cls["slice"](7)||"100%";
const map={0:"0",defaultsize:"100%"};
const val=map[raw]||parsearbitrary(raw)||raw;
if(val)return {"--ax-invert":`invert(${val})`,"filter":filtercomposed};
}
if(cls["startsWith"]("sepia")){
const raw="sepia"===cls?"100%":cls["slice"](6)||"100%";
const map={0:"0",defaultsize:"100%"};
const val=map[raw]||parsearbitrary(raw)||raw;
if(val)return {"--ax-sepia":`sepia(${val})`,"filter":filtercomposed};
}
if(cls["startsWith"]("hue-rotate-")){
const rawval=cls["slice"](11);
if(/^-?\d+$/.test(rawval))return {"--ax-hue-rotate":`hue-rotate(${rawval}deg)`,"filter":filtercomposed};
}
if(cls["startsWith"]("drop-shadow")){
const map={sm:"drop-shadow(0 1px 1px rgba(0,0,0,0.05))",defaultsize:"drop-shadow(0 1px 2px rgba(0,0,0,0.1)) drop-shadow(0 1px 1px rgba(0,0,0,0.06))",md:"drop-shadow(0 4px 3px rgba(0,0,0,0.07)) drop-shadow(0 2px 2px rgba(0,0,0,0.06))",lg:"drop-shadow(0 10px 8px rgba(0,0,0,0.04)) drop-shadow(0 4px 3px rgba(0,0,0,0.1))",xl:"drop-shadow(0 20px 13px rgba(0,0,0,0.03)) drop-shadow(0 8px 5px rgba(0,0,0,0.08))","2xl":"drop-shadow(0 25px 25px rgba(0,0,0,0.15))",none:"drop-shadow(0 0 #0000)"};
const key="drop-shadow"===cls?"defaultsize":cls["slice"](12);
if(map[key])return {"--ax-drop-shadow":map[key],"filter":filtercomposed};
const arb=parsearbitrary(key);
if(arb)return {"--ax-drop-shadow":`drop-shadow(${arb})`,"filter":filtercomposed};
}
if("filter-none"===cls)return {"filter":"none"};
if(cls["startsWith"]("backdrop-")){
const rawval=cls["slice"](9);
if(rawval["startsWith"]("blur")){
const raw="blur"===rawval?"8px":rawval["slice"](5)||"8px";
const map={none:"0",sm:"4px",defaultsize:"8px",md:"12px",lg:"16px",xl:"24px","2xl":"40px","3xl":"64px"};
const val=map[raw]||parsearbitrary(raw);
if(val)return {"--ax-bd-blur":`blur(${val})`,"backdrop-filter":backdropcomposed,"-webkit-backdrop-filter":backdropcomposed};
}
if(rawval["startsWith"]("brightness-")){
const raw=rawval["slice"](11);
const map={0:"0",50:".5",75:".75",90:".9",95:".95",100:"1",105:"1.05",110:"1.1",125:"1.25",150:"1.5",200:"2"};
const val=map[raw]||parsearbitrary(raw);
if(val)return {"--ax-bd-brightness":`brightness(${val})`,"backdrop-filter":backdropcomposed,"-webkit-backdrop-filter":backdropcomposed};
}
if(rawval["startsWith"]("contrast-")){
const raw=rawval["slice"](9);
const map={0:"0",50:".5",75:".75",100:"1",125:"1.25",150:"1.5",200:"2"};
const val=map[raw]||parsearbitrary(raw);
if(val)return {"--ax-bd-contrast":`contrast(${val})`,"backdrop-filter":backdropcomposed,"-webkit-backdrop-filter":backdropcomposed};
}
if(rawval["startsWith"]("grayscale")){
const raw="grayscale"===rawval?"100%":rawval["slice"](10)||"100%";
return {"--ax-bd-grayscale":`grayscale(${raw})`,"backdrop-filter":backdropcomposed,"-webkit-backdrop-filter":backdropcomposed};
}
if(rawval["startsWith"]("invert")){
const raw="invert"===rawval?"100%":rawval["slice"](7)||"100%";
return {"--ax-bd-invert":`invert(${raw})`,"backdrop-filter":backdropcomposed,"-webkit-backdrop-filter":backdropcomposed};
}
if(rawval["startsWith"]("opacity-")){
const raw=rawval["slice"](8);
return {"--ax-bd-opacity":`opacity(${root["parseInt"](raw)/100})`,"backdrop-filter":backdropcomposed,"-webkit-backdrop-filter":backdropcomposed};
}
if(rawval["startsWith"]("saturate-")){
const raw=rawval["slice"](9);
return {"--ax-bd-saturate":`saturate(${raw})`,"backdrop-filter":backdropcomposed,"-webkit-backdrop-filter":backdropcomposed};
}
if(rawval["startsWith"]("sepia")){
const raw="sepia"===rawval?"100%":rawval["slice"](6)||"100%";
return {"--ax-bd-sepia":`sepia(${raw})`,"backdrop-filter":backdropcomposed,"-webkit-backdrop-filter":backdropcomposed};
}
if(rawval["startsWith"]("hue-rotate-")){
const raw=rawval["slice"](11);
return {"--ax-bd-hue-rotate":`hue-rotate(${raw}deg)`,"backdrop-filter":backdropcomposed,"-webkit-backdrop-filter":backdropcomposed};
}
if("filter-none"===rawval)return {"backdrop-filter":"none","-webkit-backdrop-filter":"none"};
}
if(cls["startsWith"]("mix-blend-")){
const list=["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion","hue","saturation","color","luminosity","plus-lighter"];
const val=cls["slice"](10);
if(list["includes"](val))return {"mix-blend-mode":val};
}
if(cls["startsWith"]("bg-blend-")){
const list=["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion","hue","saturation","color","luminosity"];
const val=cls["slice"](9);
if(list["includes"](val))return {"background-blend-mode":val};
}
if("isolate"===cls)return {"isolation":"isolate"};
if("isolation-auto"===cls)return {"isolation":"auto"};
if("animate-spin"===cls)return {"animation":"ax-spin 1s linear infinite"};
if("animate-ping"===cls)return {"animation":"ax-ping 1s cubic-bezier(0,0,0.2,1) infinite"};
if("animate-pulse"===cls)return {"animation":"ax-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite"};
if("animate-bounce"===cls)return {"animation":"ax-bounce 1s infinite"};
if("animate-float"===cls)return {"animation":"ax-float 3s ease-in-out infinite"};
if("animate-shimmer"===cls)return {"animation":"ax-shimmer 2s linear infinite","background-size":"200% 100%"};
if("animate-glow"===cls)return {"animation":"ax-glow 2s ease-in-out infinite"};
if("animate-fade-in"===cls)return {"animation":"ax-fade-in 0.5s ease-out"};
if("animate-slide-up"===cls)return {"animation":"ax-slide-up 0.5s ease-out"};
if("animate-scale-in"===cls)return {"animation":"ax-scale-in 0.3s ease-out"};
if("animate-marquee"===cls)return {"animation":"ax-marquee 20s linear infinite"};
if("animate-none"===cls)return {"animation":"none"};
if(cls["startsWith"]("animate-[")){
const rawval=parsearbitrary(cls["slice"](8));
if(rawval)return {"animation":rawval};
}
if(cls["startsWith"]("will-change-")){
const rawval=cls["slice"](12);
if(["auto","scroll","contents","transform"]["includes"](rawval))return {"will-change":"scroll"===rawval?"scroll-position":rawval};
const arb=parsearbitrary(rawval);
if(arb)return {"will-change":arb};
}
if(cls["startsWith"]("touch-")){
const map={auto:"auto",none:"none","pan-x":"pan-x","pan-left":"pan-left","pan-right":"pan-right","pan-y":"pan-y","pan-up":"pan-up","pan-down":"pan-down","pinch-zoom":"pinch-zoom",manipulation:"manipulation"};
const rawval=cls["slice"](6);
if(map[rawval])return {"touch-action":map[rawval]};
}
if(cls["startsWith"]("resize")){
if("resize-none"===cls)return {"resize":"none"};
if("resize-y"===cls)return {"resize":"vertical"};
if("resize-x"===cls)return {"resize":"horizontal"};
if("resize"===cls)return {"resize":"both"};
}
if("appearance-none"===cls)return {"appearance":"none"};
if("appearance-auto"===cls)return {"appearance":"auto"};
if(cls["startsWith"]("accent-")){
const rawval=parsecolor(cls["slice"](7))||parsearbitrary(cls["slice"](7));
if(rawval)return {"accent-color":rawval};
}
if(cls["startsWith"]("caret-")){
const rawval=parsecolor(cls["slice"](6))||parsearbitrary(cls["slice"](6));
if(rawval)return {"caret-color":rawval};
}
if("list-none"===cls)return {"list-style-type":"none"};
if("list-disc"===cls)return {"list-style-type":"disc"};
if("list-decimal"===cls)return {"list-style-type":"decimal"};
if("list-inside"===cls)return {"list-style-position":"inside"};
if("list-outside"===cls)return {"list-style-position":"outside"};
if("sr-only"===cls)return {"position":"absolute","width":"1px","height":"1px","padding":"0","margin":"-1px","overflow":"hidden","clip":"rect(0,0,0,0)","white-space":"nowrap","border-width":"0"};
if("not-sr-only"===cls)return {"position":"static","width":"auto","height":"auto","padding":"0","margin":"0","overflow":"visible","clip":"auto","white-space":"normal"};
if("visible"===cls)return {"visibility":"visible"};
if("invisible"===cls)return {"visibility":"hidden"};
if("collapse"===cls)return {"visibility":"collapse"};
if("table-auto"===cls)return {"table-layout":"auto"};
if("table-fixed"===cls)return {"table-layout":"fixed"};
if("float-right"===cls)return {"float":"right"};
if("float-left"===cls)return {"float":"left"};
if("float-none"===cls)return {"float":"none"};
if("clear-left"===cls)return {"clear":"left"};
if("clear-right"===cls)return {"clear":"right"};
if("clear-both"===cls)return {"clear":"both"};
if("clear-none"===cls)return {"clear":"none"};
if("box-border"===cls)return {"box-sizing":"border-box"};
if("box-content"===cls)return {"box-sizing":"content-box"};
if("box-decoration-clone"===cls)return {"box-decoration-break":"clone","-webkit-box-decoration-break":"clone"};
if("box-decoration-slice"===cls)return {"box-decoration-break":"slice","-webkit-box-decoration-break":"slice"};
if("container"===cls)return {"width":"100%"};
if(cls["startsWith"]("container-")){
const rawval=cls["slice"](10);
if(containers[rawval])return {"max-width":containers[rawval]};
}
if("glass"===cls)return {"backdrop-filter":"blur(16px) saturate(180%)","-webkit-backdrop-filter":"blur(16px) saturate(180%)","background-color":"rgba(255,255,255,0.1)","border":"1px solid rgba(255,255,255,0.18)"};
if("glass-dark"===cls)return {"backdrop-filter":"blur(16px) saturate(180%)","-webkit-backdrop-filter":"blur(16px) saturate(180%)","background-color":"rgba(17,25,40,0.75)","border":"1px solid rgba(255,255,255,0.125)"};
if("glass-strong"===cls)return {"backdrop-filter":"blur(24px) saturate(200%)","-webkit-backdrop-filter":"blur(24px) saturate(200%)","background-color":"rgba(255,255,255,0.15)","border":"1px solid rgba(255,255,255,0.2)","box-shadow":"0 8px 32px 0 rgba(31,38,135,0.37)"};
if("text-gradient"===cls)return {"background-image":"linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899)","-webkit-background-clip":"text","background-clip":"text","color":"transparent"};
if("text-gradient-2"===cls)return {"background-image":"linear-gradient(135deg, #667eea 0%, #764ba2 100%)","-webkit-background-clip":"text","background-clip":"text","color":"transparent"};
if("border-gradient"===cls)return {"border-image":"linear-gradient(to right, #3b82f6, #8b5cf6) 1","border-style":"solid","border-width":"1px"};
if("shimmer"===cls)return {"background":"linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)","background-size":"200% 100%","animation":"ax-shimmer 1.5s infinite"};
if("glow"===cls)return {"box-shadow":"0 0 20px rgba(59,130,246,0.5), 0 0 40px rgba(59,130,246,0.3)"};
if("glow-purple"===cls)return {"box-shadow":"0 0 20px rgba(139,92,246,0.5), 0 0 40px rgba(139,92,246,0.3)"};
if("inner-glow"===cls)return {"box-shadow":"inset 0 0 20px rgba(255,255,255,0.2)"};
if("card"===cls)return {"background-color":"#fff","border-radius":"1rem","box-shadow":"0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1)","padding":"1.5rem","border":"1px solid #e5e7eb"};
if("btn"===cls)return {"display":"inline-flex","align-items":"center","justify-content":"center","border-radius":"0.5rem","padding":"0.5rem 1rem","font-weight":"500","font-size":"0.875rem","transition":"all 150ms","cursor":"pointer","user-select":"none","border":"1px solid transparent","line-height":"1.25rem"};
if("btn-primary"===cls)return {"display":"inline-flex","align-items":"center","justify-content":"center","border-radius":"0.5rem","padding":"0.625rem 1.25rem","font-weight":"600","background-color":"#2563eb","color":"#fff","box-shadow":"0 4px 6px -1px rgba(37,99,235,0.3)","transition":"all 150ms","cursor":"pointer"};
if("btn-ghost"===cls)return {"display":"inline-flex","align-items":"center","justify-content":"center","border-radius":"0.5rem","padding":"0.5rem 1rem","font-weight":"500","background-color":"transparent","color":"#374151","transition":"all 150ms","cursor":"pointer"};
if("input"===cls)return {"display":"flex","height":"2.5rem","width":"100%","border-radius":"0.5rem","border":"1px solid #d1d5db","background-color":"#fff","padding":"0.5rem 0.75rem","font-size":"0.875rem","transition":"all 150ms","outline":"none"};
if("badge"===cls)return {"display":"inline-flex","align-items":"center","border-radius":"9999px","padding":"0.125rem 0.625rem","font-size":"0.75rem","font-weight":"600","background-color":"#f3f4f6","color":"#1f2937"};
if("scrollbar-none"===cls)return {"-ms-overflow-style":"none","scrollbar-width":"none","&::-webkit-scrollbar":"display:none"};
if("scrollbar-thin"===cls)return {"scrollbar-width":"thin"};
if("center"===cls)return {"display":"flex","align-items":"center","justify-content":"center"};
if("center-x"===cls)return {"display":"flex","justify-content":"center"};
if("center-y"===cls)return {"display":"flex","align-items":"center"};
if("full"===cls)return {"width":"100%","height":"100%"};
if("screen"===cls)return {"width":"100vw","height":"100vh"};
if("text-fluid"===cls)return {"font-size":"clamp(1rem, 2vw + 0.5rem, 2rem)"};
if("text-fluid-lg"===cls)return {"font-size":"clamp(1.5rem, 4vw + 1rem, 4rem)"};
if("text-fluid-xl"===cls)return {"font-size":"clamp(2rem, 6vw + 1rem, 6rem)"};
if(cls["startsWith"]("color-scheme-")){const rawval=cls["slice"](13);return {"color-scheme":rawval};}
if("field-sizing-content"===cls)return {"field-sizing":"content"};
if("field-sizing-fixed"===cls)return {"field-sizing":"fixed"};
if("forced-color-adjust-auto"===cls)return {"forced-color-adjust":"auto"};
if("forced-color-adjust-none"===cls)return {"forced-color-adjust":"none"};
if(cls["startsWith"]("clip-path-[")){
const rawval=parsearbitrary(cls["slice"](10));
if(rawval)return {"clip-path":rawval};
}
if(cls["startsWith"]("mask-[")){
const rawval=parsearbitrary(cls["slice"](5));
if(rawval)return {"mask-image":rawval};
}
return null;
}

const variantmap={hover:":hover",focus:":focus",active:":active",visited:":visited",disabled:":disabled","focus-within":":focus-within","focus-visible":":focus-visible",first:":first-child",last:":last-child",odd:":nth-child(odd)",even:":nth-child(even)",checked:":checked",required:":required",optional:":optional",valid:":valid",invalid:":invalid","read-only":":read-only",empty:":empty",indeterminate:":indeterminate",placeholder:":placeholder-shown","placeholder-shown":":placeholder-shown",before:"::before",after:"::after",marker:"::marker",selection:"::selection",file:"::file-selector-button",backdrop:"::backdrop",open:"[open]","first-letter":"::first-letter","first-line":"::first-line",default:":default",autofill:":autofill"};
function buildrule(fullclass,decl,variants,important){
if(decl["child"]){
const sel=escapeselector(fullclass);
let base=`.${sel}`;
let pseudo="";
let bp=null;
let isdark=false;
let group=null;
let peer=null;
let media=null;
for(let rawval of variants){
if(variantmap[rawval])pseudo+=variantmap[rawval];
else if(breakpoints[rawval])bp=breakpoints[rawval];
else if("dark"===rawval)isdark=true;
else if(rawval["startsWith"]("group-"))group=rawval["slice"](6);
else if(rawval["startsWith"]("peer-"))peer=rawval["slice"](5);
else if("print"===rawval)media="print";
else if(rawval["startsWith"]("not-")){
const inner=rawval["slice"](4);
const pp=variantmap[inner]||`:${inner}`;
pseudo+=`:not(${pp})`;
}
}
let out=base+pseudo;
if(group){
const gp=variantmap[group]||`:${group}`;
out=`.group${gp} ${out}`;
}
if(peer){
const pp=variantmap[peer]||`:${peer}`;
out=`.peer${pp} ~ ${out}`;
}
if(isdark)out=`.dark ${out}`;
const childcss=decl["child"];
const idx=childcss["indexOf"]("{");
const before=childcss["slice"](0,idx);
const inside=childcss["slice"](idx+1,-1);
let rule=`${out}${before}{${inside}}`;
if(bp)rule=`@media (min-width:${bp}){${rule}}`;
if(media)rule=`@media ${media}{${rule}}`;
return rule;
}
let selector=`.${escapeselector(fullclass)}`;
let pseudo="";
let bp=null;
let isdark=false;
let group=null;
let peer=null;
let has=null;
let aria=null;
let data=null;
let container=null;
let supports=null;
let dir=null;
let motion=null;
let extra=null;
let insel=null;
for(let rawval of variants){
if(variantmap[rawval])pseudo+=variantmap[rawval];
else if(breakpoints[rawval])bp=breakpoints[rawval];
else if("dark"===rawval)isdark=true;
else if(rawval["startsWith"]("group-"))group=rawval["slice"](6);
else if(rawval["startsWith"]("peer-"))peer=rawval["slice"](5);
else if(rawval["startsWith"]("has-"))has=rawval["slice"](4);
else if(rawval["startsWith"]("aria-"))aria=`[aria-${rawval["slice"](5)}]`;
else if(rawval["startsWith"]("data-"))data=`[data-${rawval["slice"](5)}]`;
else if(rawval["startsWith"]("@"))container=rawval["slice"](1);
else if(rawval["startsWith"]("supports-")){
const inner=rawval["slice"](9)["replace"](/_/g," ")["replace"](/^\[(.*)\]$/,"$1");
supports=inner;
}
else if("ltr"===rawval)dir=`[dir="ltr"]`;
else if("rtl"===rawval)dir=`[dir="rtl"]`;
else if("motion-safe"===rawval)motion="(prefers-reduced-motion: no-preference)";
else if("motion-reduce"===rawval)motion="(prefers-reduced-motion: reduce)";
else if("print"===rawval)motion="print";
else if("portrait"===rawval)motion="(orientation: portrait)";
else if("landscape"===rawval)motion="(orientation: landscape)";
else if("contrast-more"===rawval)motion="(prefers-contrast: more)";
else if("contrast-less"===rawval)motion="(prefers-contrast: less)";
else if(rawval["startsWith"]("not-")){
const inner=rawval["slice"](4);
const pp=variantmap[inner]||`:${inner}`;
pseudo+=`:not(${pp})`;
}
else if(rawval["startsWith"]("in-")){
const inner=rawval["slice"](3)["replace"](/_/g," ")["replace"](/^\[(.*)\]$/,"$1");
extra=inner;
}
else if("*"===rawval)insel="> *";
else if("**"===rawval)insel="*";
else if("["===rawval[0]&&"]"===rawval[rawval["length"]-1]){
const inner=rawval["slice"](1,-1)["replace"](/_/g," ");
if(inner["includes"]("&")){
selector=inner["replace"](/&/g,`.${escapeselector(fullclass)}`);
pseudo="";
}else pseudo+=inner;
}
else if(rawval["startsWith"]("min-")&&breakpoints[rawval["slice"](4)])bp=breakpoints[rawval["slice"](4)];
}
let fullsel=selector+pseudo;
if(aria)fullsel+=aria;
if(data)fullsel+=data;
if(has)fullsel+=`:has(${has})`;
if(extra)fullsel=`:where(${extra}) ${fullsel}`;
if(dir)fullsel=`${dir} ${fullsel}`;
if(group){
const gp=variantmap[group]||`:${group}`;
fullsel=`.group${gp} ${fullsel}`;
}
if(peer){
const pp=variantmap[peer]||`:${peer}`;
fullsel=`.peer${pp} ~ ${fullsel}`;
}
if(isdark)fullsel=`.dark ${fullsel}`;
if(insel)fullsel=`:where(${insel}) ${fullsel}`;
let body="";
for(let key in decl){
if(key["startsWith"]("__"))continue;
let val=decl[key];
if(important&&!root["String"](val)["includes"]("!important"))val=`${val}!important`;
body+=`${key}:${val};`;
}
let rule=`${fullsel}{${body}}`;
if(container)rule=`@container ${container}{${rule}}`;
if(supports)rule=`@supports ${supports}{${rule}}`;
if(bp)rule=`@media (min-width:${bp}){${rule}}`;
if(motion)rule=`@media ${motion}{${rule}}`;
return rule;
}
function ensurebase(){
if(sheetbase&&sheetdynamic)return;
const baseel=doc["createElement"]("style");
baseel["setAttribute"]("data-axom","base");
baseel["textContent"]="*,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}html{line-height:1.5;-webkit-text-size-adjust:100%;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif}body{margin:0}button,input,optgroup,select,textarea{font:inherit;color:inherit}img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle;max-width:100%}img,video{height:auto}[hidden]{display:none}:root{--ax-ring-offset-width:0px;--ax-ring-offset-color:#fff;--ax-ring-color:rgba(59,130,246,0.5);--ax-shadow:0 0 #0000;--ax-tx:0;--ax-ty:0;--ax-tz:0;--ax-rot:0;--ax-rot-x:0;--ax-rot-y:0;--ax-rot-z:0;--ax-skew-x:0;--ax-skew-y:0;--ax-sx:1;--ax-sy:1;--ax-sz:1}@keyframes ax-spin{to{transform:rotate(360deg)}}@keyframes ax-ping{75%,100%{transform:scale(2);opacity:0}}@keyframes ax-pulse{50%{opacity:.5}}@keyframes ax-bounce{0%,100%{transform:translateY(-25%);animation-timing-function:cubic-bezier(.8,0,1,1)}50%{transform:translateY(0);animation-timing-function:cubic-bezier(0,0,.2,1)}}@keyframes ax-fade-in{from{opacity:0}to{opacity:1}}@keyframes ax-fade-out{from{opacity:1}to{opacity:0}}@keyframes ax-slide-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes ax-slide-down{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes ax-scale-in{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}@keyframes ax-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes ax-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}@keyframes ax-glow{0%,100%{box-shadow:0 0 5px var(--ax-glow,rgba(59,130,246,0.5)),0 0 20px var(--ax-glow,rgba(59,130,246,0.3))}50%{box-shadow:0 0 20px var(--ax-glow,rgba(59,130,246,0.8)),0 0 40px var(--ax-glow,rgba(59,130,246,0.5))}}@keyframes ax-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}@keyframes ax-morph{0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%}50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%}}";
doc["head"]["prepend"](baseel);
const dynel=doc["createElement"]("style");
dynel["setAttribute"]("data-axom","dynamic");
doc["head"]["appendChild"](dynel);
sheetbase=baseel;
sheetdynamic=dynel;
}
function flushqueue(){
if(flushscheduled)return;
flushscheduled=true;
const run=()=>{
if(0===pendingcss["length"]){flushscheduled=false;return;}
ensurebase();
sheetdynamic["textContent"]+=pendingcss["join"]("");
pendingcss["length"]=0;
flushscheduled=false;
if(!firstflushdone){
firstflushdone=true;
if(html){
html["classList"]["remove"]("axom-loading");
html["classList"]["add"]("axom-ready");
}
if(foucstyle&&foucstyle["parentNode"]){
root["setTimeout"](()=>{
try{foucstyle["textContent"]="html.axom-ready body{opacity:1}";}catch(err){}
},50);
}
}
};
if("function"==typeof root["queueMicrotask"])root["queueMicrotask"](run);
else if("function"==typeof root["requestAnimationFrame"])root["requestAnimationFrame"](run);
else root["setTimeout"](run,0);
}
function processclass(full){
if(!full||injected["has"](full))return;
if(-1!==full["indexOf"](" "))return;
injected["add"](full);
let raw=full;
let imp=false;
const parts=full["split"](":");
const last=parts["pop"]();
const variants=parts;
if("!"===last[0]){imp=true;raw=last["slice"](1);}
else if("!"===last[last["length"]-1]&&"\\"!==last[last["length"]-2]){imp=true;raw=last["slice"](0,-1);}
else raw=last;
if(variants["length"]&&"!"===variants[0][0]){imp=true;variants[0]=variants[0]["slice"](1);}
let isneg=false;
let cls=raw;
if("-"===cls[0]){isneg=true;cls=cls["slice"](1);}
const key=(isneg?"-":"")+cls;
let decl=declcache["get"](key);
if(void 0===decl){decl=builddecl(cls,isneg);declcache["set"](key,decl);}
if(!decl)return;
const rule=buildrule(full,decl,variants,imp);
if(rule){pendingcss["push"](rule);flushqueue();}
}
const seenelements=new root["WeakSet"]();
function scanelement(elem){
if(!elem||!elem["classList"])return;
const list=elem["classList"];
for(let idx=0;idx<list["length"];idx++){
const clsname=list[idx];
if(!injected["has"](clsname))processclass(clsname);
}
seenelements["add"](elem);
}
function scantree(rootnode){
if(!rootnode)return;
if(rootnode["querySelectorAll"]){
const nodes=rootnode["querySelectorAll"]("[class]");
for(let idx=0;idx<nodes["length"];idx++)scanelement(nodes[idx]);
}
if(rootnode!==doc&&rootnode["classList"])scanelement(rootnode);
}
function startobserver(){
if(observer)return;
observer=new root["MutationObserver"](muts=>{
for(let mut of muts){
if("attributes"===mut["type"]&&"class"===mut["attributeName"]){
const elem=mut["target"];
if(elem["classList"]){
const list=elem["classList"];
for(let idx=0;idx<list["length"];idx++){
const clsname=list[idx];
if(!injected["has"](clsname))processclass(clsname);
}
}
}else if("childList"===mut["type"]){
const added=mut["addedNodes"];
for(let idx=0;idx<added["length"];idx++){
const node=added[idx];
if(1!==node["nodeType"])continue;
if(node["hasAttribute"]&&node["hasAttribute"]("class")){
const list=node["classList"];
for(let jdx=0;jdx<list["length"];jdx++){
const clsname=list[jdx];
if(!injected["has"](clsname))processclass(clsname);
}
}
if(node["querySelectorAll"]){
const nodes=node["querySelectorAll"]("[class]");
for(let jdx=0;jdx<nodes["length"];jdx++){
const elem=nodes[jdx];
const list=elem["classList"];
for(let kdx=0;kdx<list["length"];kdx++){
const clsname=list[kdx];
if(!injected["has"](clsname))processclass(clsname);
}
}
}
}
}
}
});
observer["observe"](html,{"childList":true,"subtree":true,"attributes":true,"attributeFilter":["class"]});
}
function initall(){
ensurebase();
scantree(doc);
flushqueue();
startobserver();
}
if(doc){
ensurebase();
if(doc["body"])scantree(doc);
if("function"==typeof root["queueMicrotask"])root["queueMicrotask"](()=>{scantree(doc);flushqueue();});
}
const publicapi={
scan:scantree,
process:processclass,
colors:rawcolors,
config:{"breakpoints":breakpoints,"containers":containers},
addkeyframe(name,body){ensurebase();sheetbase["textContent"]+=`@keyframes ${name}{${body}}`;},
addvariant(name,pseudo){variantmap[name]=pseudo;},
get stats(){return {"utilities":injected["size"],"cache":declcache["size"],"pending":pendingcss["length"]};},
flush:flushqueue,
"injected":injected,
"declcache":declcache
};
root["axomcss"]=publicapi;
root["AxomCSS"]=publicapi;
if(doc){
if(doc["readyState"]==="loading"){
doc["addEventListener"]("DOMContentLoaded",initall,{"once":true});
root["addEventListener"]("load",()=>{scantree(doc);flushqueue();},{"once":true});
}else initall();
}
}(typeof window!="undefined"?window:window);
