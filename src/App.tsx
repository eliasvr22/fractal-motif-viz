/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";

// Fractal Motif Visualizer — Live Show Edition
// Single-file React + WebGL visual for experimental/techno/ambient sets.
// Motifs arranged via procedural patterns, kaleidoscopic folds, and IFS-style domain transforms.
// Optional audio reactivity via microphone (Web Audio API).
// Controls: presets, motif/arrangement/palette selectors, sliders, audio toggle/amount.
// Shortcuts: Space = pause/resume · R = randomize · 1–6 = presets.

export default function LiveFractalMotifApp() {
  // ---------- UI State
  const [paused, setPaused] = useState(false);
  const [motif, setMotif] = useState(0); // 0=circle,1=polygon,2=cross,3=capsule
  const [arrangement, setArrangement] = useState(0); // 0=spiral,1=ring,2=grid,3=lissajous
  const [palette, setPalette] = useState(2); // 0..5
  const [folds, setFolds] = useState(8); // kaleidoscope segments
  const [iterations, setIterations] = useState(3); // IFS-style folds
  const [count, setCount] = useState(80); // instances (<= MAX_COUNT)
  const [size, setSize] = useState(0.06);
  const [thick, setThick] = useState(0.02); // for cross/capsule
  const [scale, setScale] = useState(1.0); // world scale
  const [warp, setWarp] = useState(1.1); // domain warp amount
  const [noiseScale, setNoiseScale] = useState(3.0);
  const [noiseAmt, setNoiseAmt] = useState(0.35);
  const [speed, setSpeed] = useState(0.9);
  const [reactive, setReactive] = useState(0.6); // audio modulation 0..1
  const [useMic, setUseMic] = useState(false);
  const [pixelate, setPixelate] = useState(0.0);

  const presets = useMemo(
    () => [
      {
        name: "Monolith Spiral",
        v: { motif: 3, arrangement: 0, palette: 4, folds: 12, iterations: 2, count: 72, size: 0.07, thick: 0.03, scale: 1.1, warp: 0.8, noiseScale: 2.4, noiseAmt: 0.25, speed: 0.7, reactive: 0.4, pixelate: 0.0 },
      },
      {
        name: "Krakow Bloom",
        v: { motif: 0, arrangement: 0, palette: 2, folds: 10, iterations: 4, count: 96, size: 0.055, thick: 0.02, scale: 1.0, warp: 1.4, noiseScale: 3.3, noiseAmt: 0.38, speed: 1.0, reactive: 0.7, pixelate: 0.0 },
      },
      {
        name: "Grid Apparitions",
        v: { motif: 1, arrangement: 2, palette: 5, folds: 6, iterations: 3, count: 81, size: 0.07, thick: 0.02, scale: 1.2, warp: 1.0, noiseScale: 4.5, noiseAmt: 0.30, speed: 0.85, reactive: 0.5, pixelate: 0.08 },
      },
      {
        name: "Ring of Reeds",
        v: { motif: 2, arrangement: 1, palette: 1, folds: 16, iterations: 2, count: 60, size: 0.05, thick: 0.028, scale: 1.0, warp: 1.2, noiseScale: 2.8, noiseAmt: 0.22, speed: 0.9, reactive: 0.6, pixelate: 0.0 },
      },
      {
        name: "Broken Lissajous",
        v: { motif: 3, arrangement: 3, palette: 0, folds: 7, iterations: 5, count: 88, size: 0.06, thick: 0.025, scale: 0.95, warp: 1.5, noiseScale: 5.0, noiseAmt: 0.42, speed: 1.25, reactive: 0.7, pixelate: 0.12 },
      },
      {
        name: "Monochrome Relic",
        v: { motif: 1, arrangement: 0, palette: 3, folds: 9, iterations: 4, count: 70, size: 0.06, thick: 0.018, scale: 1.05, warp: 0.9, noiseScale: 3.6, noiseAmt: 0.28, speed: 0.65, reactive: 0.3, pixelate: 0.0 },
      },
    ],
    []
  );

  const applyPreset = (i) => {
    const p = presets[i]?.v; if (!p) return;
    setMotif(p.motif); setArrangement(p.arrangement); setPalette(p.palette);
    setFolds(p.folds); setIterations(p.iterations); setCount(p.count);
    setSize(p.size); setThick(p.thick); setScale(p.scale); setWarp(p.warp);
    setNoiseScale(p.noiseScale); setNoiseAmt(p.noiseAmt); setSpeed(p.speed);
    setReactive(p.reactive); setPixelate(p.pixelate);
  };

  const randomize = () => {
    const rnd = (a,b)=>a+Math.random()*(b-a);
    setMotif(Math.floor(rnd(0,4)));
    setArrangement(Math.floor(rnd(0,4)));
    setPalette(Math.floor(rnd(0,6)));
    setFolds(Math.floor(rnd(5,18)));
    setIterations(Math.floor(rnd(1,6)));
    setCount(Math.floor(rnd(40,120)));
    setSize(rnd(0.03,0.09));
    setThick(rnd(0.01,0.04));
    setScale(rnd(0.8,1.4));
    setWarp(rnd(0.6,1.8));
    setNoiseScale(rnd(2.0,6.0));
    setNoiseAmt(rnd(0.15,0.5));
    setSpeed(rnd(0.5,1.6));
    setReactive(rnd(0.2,0.9));
    setPixelate(rnd(0.0,0.15));
  };

  // ---------- WebGL setup
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const startRef = useRef(performance.now());
  const frameRef = useRef(null);
  const sizeRef = useRef({w:0,h:0,dpr:1});

  // Audio
  const analyserRef = useRef(null);
  const audioDataRef = useRef(null);
  const audioLevelRef = useRef({low:0, mid:0, high:0, level:0});
  const mediaStreamRef = useRef(null);

  const vertexSrc = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main(){ v_uv=(a_pos+1.0)*0.5; gl_Position=vec4(a_pos,0.0,1.0); }
  `;

  const fragmentSrc = `
    precision mediump float;
    varying vec2 v_uv;
    uniform vec2 u_res;
    uniform float u_time;
    uniform float u_scale;
    uniform float u_warp;
    uniform float u_noiseScale;
    uniform float u_noiseAmt;
    uniform float u_speed;
    uniform float u_size;
    uniform float u_thick;
    uniform float u_count; // float for dynamic break
    uniform int u_iterations;
    uniform int u_folds;
    uniform int u_arrangement;
    uniform int u_motif;
    uniform int u_palette;
    uniform float u_pixelate;
    uniform float u_aLow, u_aMid, u_aHigh, u_aLevel; // audio

    // --- utils
    #define PI 3.14159265359
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      float a=hash(i);
      float b=hash(i+vec2(1.,0.));
      float c=hash(i+vec2(0.,1.));
      float d=hash(i+vec2(1.,1.));
      vec2 u=f*f*(3.-2.*f);
      return mix(a,b,u.x)+ (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
    }
    float fbm(vec2 p){ float v=0., a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.; a*=0.5; } return v; }

    // Kaleidoscopic fold (angular mirror, N segments)
    vec2 kfold(vec2 p, int N){
      float n = float(N);
      float ang = atan(p.y,p.x);
      float r = length(p);
      float k = 2.0*PI/n;
      float a = mod(ang, k);
      a = abs(a - 0.5*k);
      return vec2(cos(a), sin(a)) * r;
    }

    // Simple 2D IFS-style box fold / scale
    vec2 ifs(vec2 p, int it){
      for(int i=0;i<10;i++){
        if(i>=it) break;
        p = abs(p);
        p = p*1.25 - 0.15; // scale then translate
        p.xy = mat2(cos(0.2), -sin(0.2), sin(0.2), cos(0.2)) * p; // slight rotate each iter
      }
      return p;
    }

    // Motif SDFs
    float sdCircle(vec2 p, float r){ return length(p)-r; }
    // Regular polygon (N=5 by palette bias) — soft edge
    float sdNgon(vec2 p, float r, int N){
      float n=float(N);
      float ang = atan(p.y,p.x);
      float a = 2.0*PI/n;
      float d = cos(floor(0.5+ang/a)*a - ang) * length(p) - r;
      return d;
    }
    float sdCross(vec2 p, float s, float t){ // cross thickness t
      p = abs(p);
      float d1 = max(p.x - t, p.y - s);
      float d2 = max(p.y - t, p.x - s);
      return min(d1,d2);
    }
    float sdCapsule(vec2 p, float halfLen, float r){ // along X
      p.x = abs(p.x);
      p.x -= halfLen;
      p.x = max(p.x, 0.0);
      return length(p) - r;
    }

    // Arrangement functions — return position for index i
    vec2 arrange(int i, float t, int mode){
      float fi = float(i);
      if(mode==0){
        // Phyllotaxis spiral
        float ga = 2.39996323; // golden angle
        float a = fi*ga + 0.25*t;
        float r = 0.015*sqrt(fi+1.0) * (0.9 + 0.2*sin(0.11*t));
        return r*vec2(cos(a), sin(a));
      } else if(mode==1){
        // Concentric ring bands
        float per = 12.0 + 8.0*sin(0.07*t);
        float ring = floor(fi / per);
        float idx = fi - ring*per;
        float a = (idx/per)*2.0*PI + 0.1*t*(1.0+0.3*ring);
        float r = 0.12 + 0.08*ring;
        return r*vec2(cos(a), sin(a));
      } else if(mode==2){
        // Grid with slow drift
        float w = 9.0;
        float x = mod(fi, w) - 0.5*(w-1.0);
        float y = floor(fi / w) - 0.5*(w-1.0);
        vec2 p = 0.08*vec2(x,y);
        p += 0.02*vec2(sin(0.31*t + y), cos(0.23*t + x));
        return p;
      } else {
        // Lissajous chain
        float s = 0.12*fi + 0.6*t;
        return 0.35*vec2(sin(2.0*s), sin(3.0*s + 0.7));
      }
    }

    vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b*cos(6.28318*(c*t + d)); }
    vec3 getPalette(int id, float t){
      if(id==0) return pal(t, vec3(0.50), vec3(0.50), vec3(1.0), vec3(0.00,0.33,0.67)); // neon
      if(id==1) return pal(t, vec3(0.55,0.35,0.30), vec3(0.45,0.35,0.30), vec3(1.0), vec3(0.0,0.15,0.25)); // sunset
      if(id==2) return pal(t, vec3(0.42,0.45,0.50), vec3(0.58,0.55,0.50), vec3(1.0), vec3(0.05,0.40,0.90)); // cyber
      if(id==3) return vec3(t); // mono
      if(id==4) return pal(t, vec3(0.28,0.32,0.40), vec3(0.72,0.68,0.60), vec3(1.0), vec3(0.10,0.20,0.35)); // ocean
      return pal(t, vec3(0.35,0.30,0.45), vec3(0.65,0.60,0.55), vec3(1.0), vec3(0.3,0.1,0.7)); // violet dusk
    }

    vec3 saturateColor(vec3 c, float sat){ float g = dot(c, vec3(0.299,0.587,0.114)); return mix(vec3(g), c, sat); }

    void main(){
      vec2 uv = v_uv;
      // Pixelation
      float px = mix(1.0, 240.0, u_pixelate);
      if(u_pixelate>0.001){ uv = (floor(uv*u_res/px)*px)/u_res; }

      // -1..1 and aspect
      vec2 p = uv*2.0 - 1.0; p.x *= u_res.x/u_res.y;

      // Audio-reactive modulations
      float rA = clamp(u_aLevel, 0.0, 1.0);
      float modSpeed = u_speed * (1.0 + 0.8*rA);
      float modSize = u_size * (1.0 + 0.6*u_aLow);
      float modWarp = u_warp * (1.0 + 0.8*u_aMid);

      float t = u_time * modSpeed;

      // Domain warp + kaleidoscope + IFS folds
      vec2 pp = p / u_scale;
      // noise warp
      vec2 nOff = vec2(fbm(pp*u_noiseScale + 0.15*t), fbm(pp*u_noiseScale*1.3 - 0.12*t));
      pp += (nOff - 0.5)*2.0 * u_noiseAmt * modWarp;
      // kaleidoscope
      pp = kfold(pp, u_folds);
      // ifs
      pp = ifs(pp, u_iterations);

      // Field accumulation from motifs
      const int MAX_COUNT = 160;
      float accum = 0.0;
      float minD = 1e9;
      for(int i=0;i<MAX_COUNT;i++){
        if(float(i) >= u_count) break;
        vec2 c = arrange(i, t, u_arrangement);
        vec2 q = pp - c;
        float d;
        if(u_motif==0){ d = sdCircle(q, modSize); }
        else if(u_motif==1){ int sides = 5 + int(mod( float(i), 3.0)); d = sdNgon(q, modSize, sides); }
        else if(u_motif==2){ d = sdCross(q, modSize*1.1, u_thick); }
        else { d = sdCapsule(q, modSize*1.5, u_thick); }
        minD = min(minD, d);
        // Gaussian falloff around boundary (both inside and outside)
        float glow = exp(-12.0*abs(d));
        accum += glow;
      }
      accum /= max(1.0, u_count*0.035);

      // Structural field and vignette
      float field = accum;
      float vig = smoothstep(1.4, 0.2, length(p));
      field *= mix(0.85, 1.15, vig);

      // Palette mapping with orbit trap hint (minD)
      float phase = fract(0.35*field + 0.25*sin(0.2*t) + 0.2*minD);
      vec3 col = getPalette(u_palette, phase);

      // Contrast/brightness via sigmoid-ish curve
      col = pow(max(col, 0.0), vec3(1.1 + 0.6*u_aHigh));
      col *= 1.0 + 0.15*field;

      // Subtle grain
      float g = hash(uv*u_res + t);
      col += (g-0.5) * 0.04;

      gl_FragColor = vec4(saturateColor(col, 1.15), 1.0);
    }
  `;

  // Compile/link once
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = (canvas.getContext("webgl", { preserveDrawingBuffer: true }) || canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true }));
    if (!gl) { console.error("WebGL not supported"); return; }
    glRef.current = gl;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, vertexSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog); programRef.current = prog;

    // Fullscreen quad
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1
    ]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const onResize = () => {
      const dpr = Math.min(2, window.devicePixelRatio||1);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      sizeRef.current = { w,h,dpr };
      canvas.width=w; canvas.height=h; canvas.style.width=`${Math.floor(w/dpr)}px`; canvas.style.height=`${Math.floor(h/dpr)}px`;
      gl.viewport(0,0,w,h);
    };
    onResize(); window.addEventListener("resize", onResize);

    const lose = () => { if(frameRef.current){ cancelAnimationFrame(frameRef.current); frameRef.current=null; } };
    canvas.addEventListener("webglcontextlost", lose);

    return () => {
      window.removeEventListener("resize", onResize); canvas.removeEventListener("webglcontextlost", lose);
      if(frameRef.current){ cancelAnimationFrame(frameRef.current); frameRef.current=null; }
      gl.deleteProgram(prog);
    };
  }, []);

  // Audio setup/teardown
  useEffect(() => {
    if(!useMic){
      if(mediaStreamRef.current){ mediaStreamRef.current.getTracks().forEach(t=>t.stop()); mediaStreamRef.current=null; }
      analyserRef.current=null; audioDataRef.current=null; return;
    }
    (async () => {
      try{
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
        mediaStreamRef.current = stream;
        const ctx = new (window.AudioContext||window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.8;
        src.connect(analyser);
        analyserRef.current = analyser;
        audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      } catch(e){ console.warn("Mic access failed", e); setUseMic(false); }
    })();
    return () => {
      if(mediaStreamRef.current){ mediaStreamRef.current.getTracks().forEach(t=>t.stop()); mediaStreamRef.current=null; }
      analyserRef.current=null; audioDataRef.current=null;
    };
  }, [useMic]);

  // Animate
  useEffect(() => {
    const gl = glRef.current; if(!gl) return; const prog = programRef.current;
    const u = {
      res: gl.getUniformLocation(prog, "u_res"),
      time: gl.getUniformLocation(prog, "u_time"),
      scale: gl.getUniformLocation(prog, "u_scale"),
      warp: gl.getUniformLocation(prog, "u_warp"),
      noiseScale: gl.getUniformLocation(prog, "u_noiseScale"),
      noiseAmt: gl.getUniformLocation(prog, "u_noiseAmt"),
      speed: gl.getUniformLocation(prog, "u_speed"),
      size: gl.getUniformLocation(prog, "u_size"),
      thick: gl.getUniformLocation(prog, "u_thick"),
      count: gl.getUniformLocation(prog, "u_count"),
      iterations: gl.getUniformLocation(prog, "u_iterations"),
      folds: gl.getUniformLocation(prog, "u_folds"),
      arrangement: gl.getUniformLocation(prog, "u_arrangement"),
      motif: gl.getUniformLocation(prog, "u_motif"),
      palette: gl.getUniformLocation(prog, "u_palette"),
      pixelate: gl.getUniformLocation(prog, "u_pixelate"),
      aLow: gl.getUniformLocation(prog, "u_aLow"),
      aMid: gl.getUniformLocation(prog, "u_aMid"),
      aHigh: gl.getUniformLocation(prog, "u_aHigh"),
      aLevel: gl.getUniformLocation(prog, "u_aLevel"),
    };

    const render = () => {
      // Audio analysis
      let aLow=0, aMid=0, aHigh=0, aLevel=0;
      const analyser = analyserRef.current; const arr = audioDataRef.current;
      if(analyser && arr){
        analyser.getByteFrequencyData(arr);
        const N = arr.length;
        const band = (lo,hi)=>{ let s=0,c=0; for(let i=lo;i<hi;i++){ s+=arr[i]; c++; } return (s/Math.max(1,c))/255; };
        aLow = band(2, Math.floor(N*0.08)); // ~<200Hz
        aMid = band(Math.floor(N*0.08), Math.floor(N*0.35)); // ~200-2k
        aHigh = band(Math.floor(N*0.35), Math.floor(N*0.75)); // ~2k-8k
        aLow = Math.pow(aLow, 1.2); aMid = Math.pow(aMid, 1.1); aHigh = Math.pow(aHigh, 1.05);
        aLevel = (0.6*aLow + 0.9*aMid + 0.5*aHigh)/2.0;
      }
      // Smooth and scale by reactive amount
      const prev = audioLevelRef.current; const lerp=(a,b,t)=>a+(b-a)*t;
      prev.low = lerp(prev.low, aLow*reactive, 0.2);
      prev.mid = lerp(prev.mid, aMid*reactive, 0.2);
      prev.high = lerp(prev.high, aHigh*reactive, 0.2);
      prev.level = lerp(prev.level, aLevel*reactive, 0.2);

      const now = performance.now();
      const t = (now - startRef.current) / 1000;
      const { w,h } = sizeRef.current;

      gl.useProgram(prog);
      gl.uniform2f(u.res, w, h);
      gl.uniform1f(u.time, t);
      gl.uniform1f(u.scale, scale);
      gl.uniform1f(u.warp, warp);
      gl.uniform1f(u.noiseScale, noiseScale);
      gl.uniform1f(u.noiseAmt, noiseAmt);
      gl.uniform1f(u.speed, speed);
      gl.uniform1f(u.size, size);
      gl.uniform1f(u.thick, thick);
      gl.uniform1f(u.count, count);
      gl.uniform1i(u.iterations, iterations);
      gl.uniform1i(u.folds, folds);
      gl.uniform1i(u.arrangement, arrangement);
      gl.uniform1i(u.motif, motif);
      gl.uniform1i(u.palette, palette);
      gl.uniform1f(u.pixelate, pixelate);
      gl.uniform1f(u.aLow, audioLevelRef.current.low);
      gl.uniform1f(u.aMid, audioLevelRef.current.mid);
      gl.uniform1f(u.aHigh, audioLevelRef.current.high);
      gl.uniform1f(u.aLevel, audioLevelRef.current.level);

      if(!paused) gl.drawArrays(gl.TRIANGLES, 0, 6);
      frameRef.current = requestAnimationFrame(render);
    };
    render();

    return () => { if(frameRef.current){ cancelAnimationFrame(frameRef.current); frameRef.current=null; } };
  }, [paused, motif, arrangement, palette, folds, iterations, count, size, thick, scale, warp, noiseScale, noiseAmt, speed, reactive, pixelate]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === " ") { e.preventDefault(); setPaused(p=>!p); }
      if (e.key.toLowerCase() === "r") randomize();
      if (e.key >= "1" && e.key <= "6") applyPreset(parseInt(e.key,10)-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const savePNG = () => {
    const canvas = canvasRef.current; if(!canvas) return;
    const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = `fractal_motif_${Date.now()}.png`; a.click();
  };

  const Select = ({ label, value, onChange, options }) => (
    <label className="text-xs text-zinc-300 flex items-center justify-between mb-2">
      <span className="uppercase tracking-wider mr-2">{label}</span>
      <select value={value} onChange={(e)=>onChange(parseInt(e.target.value,10))} className="bg-black/40 border border-white/10 rounded-md px-2 py-1 text-zinc-200">
        {options.map((o,i)=>(<option key={i} value={i}>{o}</option>))}
      </select>
    </label>
  );

  const Slider = ({ label, value, min, max, step, onChange, fmt=(v)=>v.toFixed(2) }) => (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs text-zinc-300">
        <span className="uppercase tracking-wider">{label}</span>
        <span className="tabular-nums text-zinc-400">{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e)=>onChange(parseFloat(e.target.value))} className="w-full accent-zinc-200"/>
    </div>
  );

  const Pill = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`px-3 py-1 rounded-full border text-xs transition ${active?"bg-white/10 border-white/20":"border-white/10 hover:bg-white/5"}`}>{children}</button>
  );

  return (
    <div className="h-screen w-screen bg-black text-white">
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {/* Control Panel */}
      <div className="absolute left-4 top-4 w-[360px] max-w-[92vw] backdrop-blur-md bg-black/35 border border-white/10 rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-sm font-semibold tracking-wide text-zinc-200">Fractal Motif Visualizer</h1>
          <div className="flex items-center gap-2">
            <Pill onClick={()=>setPaused(p=>!p)}>{paused?"Resume":"Pause"}</Pill>
            <Pill onClick={savePNG}>Save PNG</Pill>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {presets.map((p,i)=>(<Pill key={i} onClick={()=>applyPreset(i)}>{i+1}. {p.name}</Pill>))}
          <Pill onClick={randomize}>R. Randomize</Pill>
        </div>

        <Select label="Motif" value={motif} onChange={setMotif} options={["Circle","Polygon","Cross","Capsule"]}/>
        <Select label="Arrangement" value={arrangement} onChange={setArrangement} options={["Spiral","Ring","Grid","Lissajous"]}/>
        <Select label="Palette" value={palette} onChange={setPalette} options={["Neon","Sunset","Cyber","Monochrome","Ocean","Violet Dusk"]}/>

        <div className="grid grid-cols-2 gap-x-4">
          <Slider label="Instances" value={count} min={20} max={140} step={1} onChange={(v)=>setCount(Math.round(v))} fmt={(v)=>`${Math.round(v)}`}/>
          <Slider label="Folds" value={folds} min={3} max={18} step={1} onChange={(v)=>setFolds(Math.round(v))} fmt={(v)=>`${Math.round(v)}`}/>
          <Slider label="Iterations" value={iterations} min={1} max={6} step={1} onChange={(v)=>setIterations(Math.round(v))} fmt={(v)=>`${Math.round(v)}`}/>
          <Slider label="Size" value={size} min={0.02} max={0.1} step={0.001} onChange={setSize}/>
          <Slider label="Thickness" value={thick} min={0.005} max={0.05} step={0.001} onChange={setThick}/>
          <Slider label="Scale" value={scale} min={0.6} max={1.6} step={0.01} onChange={setScale}/>
          <Slider label="Warp" value={warp} min={0.0} max={2.0} step={0.01} onChange={setWarp}/>
          <Slider label="Noise Scale" value={noiseScale} min={1.0} max={7.0} step={0.05} onChange={setNoiseScale}/>
          <Slider label="Noise Amount" value={noiseAmt} min={0.0} max={0.8} step={0.01} onChange={setNoiseAmt}/>
          <Slider label="Speed" value={speed} min={0.3} max={1.8} step={0.01} onChange={setSpeed}/>
          <Slider label="Reactive Amt" value={reactive} min={0.0} max={1.0} step={0.01} onChange={setReactive}/>
          <Slider label="Pixelate" value={pixelate} min={0.0} max={0.2} step={0.001} onChange={setPixelate}/>
        </div>

        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input type="checkbox" checked={useMic} onChange={(e)=>setUseMic(e.target.checked)} />
            <span>Use Microphone (audio reactive)</span>
          </label>
          <div className="text-[10px] text-zinc-400">Keys: Space · R · 1–6</div>
        </div>
      </div>

      <div className="absolute bottom-3 right-4 text-[10px] text-white/60 select-none">WebGL • Kaleidoscopic IFS • {new Date().getFullYear()}</div>
    </div>
  );
}