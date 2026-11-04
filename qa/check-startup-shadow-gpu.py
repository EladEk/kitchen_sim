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


# Exercise a configured PCF comparison depth texture in a real GLES draw.
# The unconfigured control is undefined GLES behavior; it is recorded only.
vertex='#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}'
fragment='#version 300 es\nprecision highp float;\nprecision highp sampler2DShadow;\nuniform sampler2DShadow spotShadowMap[1];out vec4 result;void main(){float shadow=texture(spotShadowMap[0],vec3(.5,.5,.5));result=vec4(vec3(.8)*shadow,1.);}'
p=program(vertex,fragment)
gl('glUseProgram',None,C.c_uint)(p)
location=gl('glGetUniformLocation',C.c_int,C.c_uint,C.c_char_p)(p,b'spotShadowMap[0]')
gl('glUniform1i',None,C.c_int,C.c_int)(location,0)
texture=C.c_uint();gl('glGenTextures',None,C.c_int,C.POINTER(C.c_uint))(1,C.byref(texture));gl('glBindTexture',None,C.c_uint,C.c_uint)(0x0DE1,texture)
setparam=gl('glTexParameteri',None,C.c_uint,C.c_uint,C.c_int)
for key,value in [(0x2801,0x2600),(0x2800,0x2600),(0x2802,0x812F),(0x2803,0x812F)]:setparam(0x0DE1,key,value)
depth=(C.c_uint*1)(0xffffffff);gl('glTexImage2D',None,C.c_uint,C.c_int,C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p)(0x0DE1,0,0x81A6,1,1,0,0x1902,0x1405,depth)
geterror=gl('glGetError',C.c_uint);assert geterror()==0
clearcolor=gl('glClearColor',None,C.c_float,C.c_float,C.c_float,C.c_float);clear=gl('glClear',None,C.c_uint);draw=gl('glDrawArrays',None,C.c_uint,C.c_int,C.c_int);read=gl('glReadPixels',None,C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p)
gl('glViewport',None,C.c_int,C.c_int,C.c_int,C.c_int)(0,0,16,16)
clearcolor(.1,.1,.1,1);clear(0x4000);draw(4,0,3);missing=geterror();before=(C.c_ubyte*4)();read(8,8,1,1,0x1908,0x1401,before)
setparam(0x0DE1,0x884C,0x884E);setparam(0x0DE1,0x884D,0x0203);draw(4,0,3);ready=geterror()
pixel=(C.c_ubyte*4)();read(8,8,1,1,0x1908,0x1401,pixel)
# Native GLES permits undefined results here; WebGL validates the sampler contract.
assert missing in (0,0x0502)
assert ready==0 and pixel[0]>190, f'A real comparison shadow texture must draw the lit mesh: {ready} {list(pixel)}'
print(json.dumps({'uninitializedShadowError':missing,'uninitializedPixel':list(before),'initializedShadowError':ready,'litPixel':list(pixel)}))
efunc('eglTerminate',C.c_uint,[C.c_void_p])(display)
