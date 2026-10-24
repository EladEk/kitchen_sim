"""Native GLES3 geometry review, with depth testing; not a browser screenshot.

Run after export-building-review.mjs, passing its output prefix. This review
uses the actual transformed scene triangles, simple lighting and flat colours.
"""
import ctypes as C,ctypes.util,json,sys
from pathlib import Path
import numpy as np
from PIL import Image
prefix=Path(sys.argv[1]);meta=json.loads(prefix.with_suffix('.json').read_text());size=1200
egl=C.CDLL(ctypes.util.find_library('EGL'));egl.eglGetProcAddress.argtypes=[C.c_char_p];egl.eglGetProcAddress.restype=C.c_void_p
def ef(name,result,args):
 f=getattr(egl,name);f.restype=result;f.argtypes=args;return f
def gl(name,result,*args):return C.CFUNCTYPE(result,*args)(egl.eglGetProcAddress(name.encode()))
display=gl('eglGetPlatformDisplayEXT',C.c_void_p,C.c_uint,C.c_void_p,C.POINTER(C.c_int))(0x31DD,None,None)
assert ef('eglInitialize',C.c_uint,[C.c_void_p,C.c_void_p,C.c_void_p])(display,None,None)
ef('eglBindAPI',C.c_uint,[C.c_uint])(0x30A0)
attrs=(C.c_int*15)(0x3024,8,0x3023,8,0x3022,8,0x3025,24,0x3033,1,0x3040,0x40,0x3038,0x3038,0x3038);config=C.c_void_p();count=C.c_int()
assert ef('eglChooseConfig',C.c_uint,[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_void_p),C.c_int,C.POINTER(C.c_int)])(display,attrs,C.byref(config),1,C.byref(count)) and count.value
surface=ef('eglCreatePbufferSurface',C.c_void_p,[C.c_void_p,C.c_void_p,C.POINTER(C.c_int)])(display,config,(C.c_int*5)(0x3057,size,0x3056,size,0x3038))
context=ef('eglCreateContext',C.c_void_p,[C.c_void_p,C.c_void_p,C.c_void_p,C.POINTER(C.c_int)])(display,config,None,(C.c_int*3)(0x3098,3,0x3038));assert ef('eglMakeCurrent',C.c_uint,[C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p])(display,surface,surface,context)
def shader(kind,source):
 h=gl('glCreateShader',C.c_uint,C.c_uint)(kind);s=C.c_char_p(source.encode());gl('glShaderSource',None,C.c_uint,C.c_int,C.POINTER(C.c_char_p),C.c_void_p)(h,1,C.byref(s),None);gl('glCompileShader',None,C.c_uint)(h);ok=C.c_int();gl('glGetShaderiv',None,C.c_uint,C.c_uint,C.POINTER(C.c_int))(h,0x8B81,C.byref(ok));assert ok.value;return h
program=gl('glCreateProgram',C.c_uint)();attach=gl('glAttachShader',None,C.c_uint,C.c_uint)
attach(program,shader(0x8B31,'#version 300 es\nprecision highp float;layout(location=0)in vec3 p;layout(location=1)in vec3 n;layout(location=2)in vec3 c;uniform mat4 vp;out vec3 colour;out vec3 normal;void main(){gl_Position=vp*vec4(p,1.);colour=c;normal=n;}'))
attach(program,shader(0x8B30,'#version 300 es\nprecision highp float;in vec3 colour;in vec3 normal;out vec4 result;void main(){vec3 n=normalize(normal)*(gl_FrontFacing?1.:-1.);float light=.50+.50*max(0.,dot(n,normalize(vec3(.6,1.,.7))));result=vec4(pow(colour*light,vec3(1./2.2)),1.);}'))
gl('glLinkProgram',None,C.c_uint)(program);ok=C.c_int();gl('glGetProgramiv',None,C.c_uint,C.c_uint,C.POINTER(C.c_int))(program,0x8B82,C.byref(ok));assert ok.value;gl('glUseProgram',None,C.c_uint)(program)
data=np.fromfile(prefix.with_suffix('.bin'),dtype=np.float32);buffer=C.c_uint();gl('glGenBuffers',None,C.c_int,C.POINTER(C.c_uint))(1,C.byref(buffer));gl('glBindBuffer',None,C.c_uint,C.c_uint)(0x8892,buffer);gl('glBufferData',None,C.c_uint,C.c_ssize_t,C.c_void_p,C.c_uint)(0x8892,data.nbytes,data.ctypes.data,0x88E4)
for i in range(3):gl('glEnableVertexAttribArray',None,C.c_uint)(i);gl('glVertexAttribPointer',None,C.c_uint,C.c_int,C.c_uint,C.c_uint,C.c_int,C.c_void_p)(i,3,0x1406,0,36,C.c_void_p(i*12))
gl('glEnable',None,C.c_uint)(0x0B71);gl('glViewport',None,C.c_int,C.c_int,C.c_int,C.c_int)(0,0,size,size);gl('glClearColor',None,C.c_float,C.c_float,C.c_float,C.c_float)(.88,.91,.91,1)
location=gl('glGetUniformLocation',C.c_int,C.c_uint,C.c_char_p)(program,b'vp')
for name,values in meta['cameras'].items():
 gl('glUniformMatrix4fv',None,C.c_int,C.c_int,C.c_uint,C.POINTER(C.c_float))(location,1,0,(C.c_float*16)(*values));gl('glClear',None,C.c_uint)(0x4000|0x0100);gl('glDrawArrays',None,C.c_uint,C.c_int,C.c_int)(4,0,meta['vertices']);pixels=np.empty((size,size,4),dtype=np.uint8);gl('glReadPixels',None,C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p)(0,0,size,size,0x1908,0x1401,pixels.ctypes.data);Image.fromarray(pixels[::-1,:,:3]).save(str(prefix)+'-'+name+'.png')
ef('eglTerminate',C.c_uint,[C.c_void_p])(display);print(json.dumps({'nativeGeometryViews':list(meta['cameras']),'vertices':meta['vertices']}))
