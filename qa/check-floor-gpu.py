"""Optional native GLSL checks; no browser, preview server or screenshot.

The node test supplies the actual expanded Three shader and joint helper.
Only EGL availability may skip this check. Compilation/link/render errors fail.
"""
import ctypes as C
import ctypes.util
import json
import sys

library=ctypes.util.find_library('EGL')
if not library:
    print('Native EGL is unavailable');sys.exit(77)
egl=C.CDLL(library)
egl.eglGetProcAddress.argtypes=[C.c_char_p];egl.eglGetProcAddress.restype=C.c_void_p
def efunc(name,restype,args):
    f=getattr(egl,name);f.restype=restype;f.argtypes=args;return f
def gl(name,restype,*args):
    address=egl.eglGetProcAddress(name.encode())
    if not address: raise RuntimeError('Missing GL function '+name)
    return C.CFUNCTYPE(restype,*args)(address)
getdisplay=gl('eglGetPlatformDisplayEXT',C.c_void_p,C.c_uint,C.c_void_p,C.POINTER(C.c_int))
display=getdisplay(0x31DD,None,None)
major=C.c_int();minor=C.c_int()
if not efunc('eglInitialize',C.c_uint,[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_int)])(display,C.byref(major),C.byref(minor)):
    print('Surfaceless EGL is unavailable');sys.exit(77)
efunc('eglBindAPI',C.c_uint,[C.c_uint])(0x30A0)
attrs=(C.c_int*15)(0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3033,1,0x3040,0x40,0x3038,0x3038,0x3038)
config=C.c_void_p();count=C.c_int()
assert efunc('eglChooseConfig',C.c_uint,[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_void_p),C.c_int,C.POINTER(C.c_int)])(display,attrs,C.byref(config),1,C.byref(count)) and count.value
surface=efunc('eglCreatePbufferSurface',C.c_void_p,[C.c_void_p,C.c_void_p,C.POINTER(C.c_int)])(display,config,(C.c_int*5)(0x3057,16,0x3056,16,0x3038))
context=efunc('eglCreateContext',C.c_void_p,[C.c_void_p,C.c_void_p,C.c_void_p,C.POINTER(C.c_int)])(display,config,None,(C.c_int*3)(0x3098,3,0x3038))
assert surface and context and efunc('eglMakeCurrent',C.c_uint,[C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p])(display,surface,surface,context)

create=gl('glCreateShader',C.c_uint,C.c_uint)
source=gl('glShaderSource',None,C.c_uint,C.c_int,C.POINTER(C.c_char_p),C.POINTER(C.c_int))
compile_shader=gl('glCompileShader',None,C.c_uint)
shader_status=gl('glGetShaderiv',None,C.c_uint,C.c_uint,C.POINTER(C.c_int))
shader_log=gl('glGetShaderInfoLog',None,C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_char_p)
newprogram=gl('glCreateProgram',C.c_uint)
attach=gl('glAttachShader',None,C.c_uint,C.c_uint)
link=gl('glLinkProgram',None,C.c_uint)
program_status=gl('glGetProgramiv',None,C.c_uint,C.c_uint,C.POINTER(C.c_int))
program_log=gl('glGetProgramInfoLog',None,C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_char_p)
def shader(kind,text):
    handle=create(kind);raw=C.c_char_p(text.encode());source(handle,1,C.byref(raw),None);compile_shader(handle)
    ok=C.c_int();shader_status(handle,0x8B81,C.byref(ok))
    if not ok.value:
        log=C.create_string_buffer(100000);shader_log(handle,len(log),None,log);raise RuntimeError(log.value.decode())
    return handle
def program(vertex,fragment):
    handle=newprogram();attach(handle,shader(0x8B31,vertex));attach(handle,shader(0x8B30,fragment));link(handle)
    ok=C.c_int();program_status(handle,0x8B82,C.byref(ok))
    if not ok.value:
        log=C.create_string_buffer(100000);program_log(handle,len(log),None,log);raise RuntimeError(log.value.decode())
    return handle

payload=json.load(sys.stdin)
for pair in payload['programs']:program(pair['vertex'],pair['fragment'])
if payload.get('compileOnly'):
    print(json.dumps({'linked':len(payload['programs'])}));sys.exit(0)
vertex='#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}'
prefix='#version 300 es\nprecision highp float;\nprecision highp int;\nout vec4 result;\n'+payload['common']
coverage=program(vertex,prefix+'\nuniform float distanceMetres,footprintMetres;\nvoid main(){float c=floorLineCoverage(vec2(distanceMetres),vec2(footprintMetres)).x;result=vec4(c,c,c,1.);}')
use=gl('glUseProgram',None,C.c_uint);uniform=gl('glGetUniformLocation',C.c_int,C.c_uint,C.c_char_p);setfloat=gl('glUniform1f',None,C.c_int,C.c_float)
draw=gl('glDrawArrays',None,C.c_uint,C.c_int,C.c_int);read=gl('glReadPixels',None,C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p)
gl('glViewport',None,C.c_int,C.c_int,C.c_int,C.c_int)(0,0,16,16)
use(coverage);setfloat(uniform(coverage,b'floorJointMetres'),.002)
values=[]
for distance,footprint in [(0,.0005),(.001,.0005),(.002,.0005),(0,.02)]:
    setfloat(uniform(coverage,b'distanceMetres'),distance);setfloat(uniform(coverage,b'footprintMetres'),footprint);draw(4,0,3)
    pixel=(C.c_ubyte*4)();read(8,8,1,1,0x1908,0x1401,pixel);values.append(pixel[0])
rotations=program(vertex,prefix+'\nvoid main(){mat2 r=floorTileRotation(floor(gl_FragCoord.xy)-vec2(8.));float d=determinant(r);bool ok=abs(d-1.)<.0001;if(floorQuarterTurns<3.)ok=ok&&abs(r[0][1])+abs(r[1][0])<.0001;result=ok?vec4(0.,1.,0.,1.):vec4(1.,0.,0.,1.);}')
use(rotations)
for turns in (4,2):
    setfloat(uniform(rotations,b'floorQuarterTurns'),turns);draw(4,0,3);pixels=(C.c_ubyte*(16*16*4))();read(0,0,16,16,0x1908,0x1401,pixels)
    assert all(pixels[i]==0 and pixels[i+1]==255 for i in range(0,len(pixels),4)), 'A tile was mirrored or a rectangular plank was quarter-turned'
print(json.dumps({'linked':len(payload['programs']),'coverage':values,'rotations':True}))
efunc('eglTerminate',C.c_uint,[C.c_void_p])(display)
