/* 3D model viewer: builds the Blockbench model with three.js and plays its animations. */
(function () {
  var root = document.getElementById('rig');
  if (!root) return;
  var vp = root.querySelector('.vp');
  var msg = root.querySelector('.msg');
  function fail(text) { msg.textContent = text; vp.classList.add('failed'); }

  if (!window.THREE) { fail('THE 3D PREVIEW COULD NOT LOAD. CHECK YOUR CONNECTION AND RELOAD.'); return; }
  var data = window.MODEL_DATA;
  if (!data) { fail('THE MODEL DATA COULD NOT BE READ.'); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
  catch (err) { fail('THIS BROWSER HAS 3D TURNED OFF (WEBGL).'); return; }

  var RAD = Math.PI / 180;
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var dirty = true;

  renderer.setClearColor(0x0b0420, 1);
  var canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '3D model viewer. Drag or use the arrow keys to rotate, plus and minus to zoom.');
  vp.insertBefore(canvas, vp.firstChild);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, 1, 1, 600);
  scene.add(camera);
  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  var headlight = new THREE.DirectionalLight(0xffffff, 0.5);
  headlight.position.set(-0.6, 0.9, 1);
  camera.add(headlight);

  var grid = new THREE.GridHelper(64, 16, 0x29f0ff, 0x4b2fa0);
  grid.position.y = -0.03;
  grid.material.transparent = true;
  grid.material.opacity = 0.75;
  scene.add(grid);

  /* TEXTURES */
  var mats = data.tex.map(function (t) {
    var map = new THREE.Texture();
    map.magFilter = THREE.NearestFilter;
    map.minFilter = THREE.NearestFilter;
    map.generateMipmaps = false;
    var img = new Image();
    img.onload = function () { map.image = img; map.needsUpdate = true; dirty = true; };
    img.src = t.s;
    var glow = /beam/i.test(t.n);
    /* The beam is made of flat planes textured on one side only, so it is drawn on both sides. */
    var opts = { map: map, side: glow ? THREE.DoubleSide : THREE.FrontSide };
    if (t.a) { opts.transparent = true; opts.depthWrite = false; opts.alphaTest = 0.02; }
    else { opts.alphaTest = 0.5; }
    return { m: glow ? new THREE.MeshBasicMaterial(opts) : new THREE.MeshLambertMaterial(opts), w: t.w, h: t.h };
  });

  
  var FACE = {
    north: { n: [0, 0, -1], c: [[1, 1, 0], [1, 0, 0], [0, 0, 0], [0, 1, 0]] },
    east:  { n: [1, 0, 0],  c: [[1, 1, 1], [1, 0, 1], [1, 0, 0], [1, 1, 0]] },
    south: { n: [0, 0, 1],  c: [[0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1]] },
    west:  { n: [-1, 0, 0], c: [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]] },
    up:    { n: [0, 1, 0],  c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
    down:  { n: [0, -1, 0], c: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]] }
  };
  var FACE_ORDER = ['north', 'east', 'south', 'west', 'up', 'down'];

  function makeCube(c, po) {
    var inf = c.i || 0;
    var lo = [c.f[0] - inf, c.f[1] - inf, c.f[2] - inf];
    var hi = [c.t[0] + inf, c.t[1] + inf, c.t[2] + inf];
    var pos = [], nor = [], uv = [], idx = [], list = [];
    var geo = new THREE.BufferGeometry();
    FACE_ORDER.forEach(function (name) {
      var f = c.u[name];
      if (!f || f[4] === null || f[4] === undefined || f[4] === false) return;
      var tx = mats[f[4]];
      if (!tx) return;
      var def = FACE[name];
      var v0 = pos.length / 3;
      for (var k = 0; k < 4; k++) {
        var p = def.c[k];
        pos.push((p[0] ? hi[0] : lo[0]) - c.o[0], (p[1] ? hi[1] : lo[1]) - c.o[1], (p[2] ? hi[2] : lo[2]) - c.o[2]);
        nor.push(def.n[0], def.n[1], def.n[2]);
      }
      var u1 = f[0] / tx.w, v1 = 1 - f[1] / tx.h, u2 = f[2] / tx.w, v2 = 1 - f[3] / tx.h;
      uv.push(u1, v1, u1, v2, u2, v2, u2, v1);
      geo.addGroup(idx.length, 6, list.length);
      idx.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
      list.push(tx.m);
    });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    var mesh = new THREE.Mesh(geo, list);
    mesh.position.set(c.o[0] - po[0], c.o[1] - po[1], c.o[2] - po[2]);
    mesh.rotation.order = 'ZYX';
    if (c.r) mesh.rotation.set(c.r[0] * RAD, c.r[1] * RAD, c.r[2] * RAD);
    return mesh;
  }

  var groups = [], byName = {};
  function makeGroup(node, po) {
    var g = new THREE.Group();
    g.name = node.n;
    g.rotation.order = 'ZYX';
    g.position.set(node.o[0] - po[0], node.o[1] - po[1], node.o[2] - po[2]);
    g.rotation.set(node.r[0] * RAD, node.r[1] * RAD, node.r[2] * RAD);
    g.userData.p = g.position.clone();
    g.userData.r = [g.rotation.x, g.rotation.y, g.rotation.z];
    groups.push(g);
    byName[node.n] = g;
    node.c.forEach(function (i) { g.add(makeCube(data.cubes[i], node.o)); });
    node.k.forEach(function (k) { g.add(makeGroup(k, node.o)); });
    return g;
  }
  var model = new THREE.Group();
  data.root.forEach(function (n) { model.add(makeGroup(n, [0, 0, 0])); });
  scene.add(model);

  /*ANIMATION*/
  var tmp = [0, 0, 0, 0];
  function sample(keys, t) {
    var n = keys.length;
    if (t <= keys[0][0]) return keys[0];
    if (t >= keys[n - 1][0]) return keys[n - 1];
    for (var i = 1; i < n; i++) {
      if (t < keys[i][0]) {
        var a = keys[i - 1], b = keys[i];
        var k = (t - a[0]) / ((b[0] - a[0]) || 1);
        tmp[1] = a[1] + (b[1] - a[1]) * k;
        tmp[2] = a[2] + (b[2] - a[2]) * k;
        tmp[3] = a[3] + (b[3] - a[3]) * k;
        return tmp;
      }
    }
    return keys[n - 1];
  }
  function pose(anim, t) {
    var i, g;
    for (i = 0; i < groups.length; i++) {
      g = groups[i];
      g.position.copy(g.userData.p);
      g.rotation.set(g.userData.r[0], g.userData.r[1], g.userData.r[2]);
      g.scale.set(1, 1, 1);
      g.visible = true;
    }
    if (!anim) return;
    for (var name in anim.k) {
      g = byName[name];
      if (!g) continue;
      var ch = anim.k[name], v;
      if (ch.rotation) {
        v = sample(ch.rotation, t);
        g.rotation.x += v[1] * RAD; g.rotation.y += v[2] * RAD; g.rotation.z += v[3] * RAD;
      }
      if (ch.position) {
        v = sample(ch.position, t);
        g.position.x += v[1]; g.position.y += v[2]; g.position.z += v[3];
      }
      if (ch.scale) {
        v = sample(ch.scale, t);
        g.scale.set(v[1], v[2], v[3]);
        if (Math.abs(v[1]) < 1e-4 && Math.abs(v[2]) < 1e-4 && Math.abs(v[3]) < 1e-4) g.visible = false;
      }
    }
  }

  /*ROTATE*/
  var cam = { theta: Math.PI - 0.55, phi: 1.32, r: 76 };
  var target = new THREE.Vector3(0, 15, 0);
  var baseR = 76, zoomed = false;
  function placeCamera() {
    var sp = Math.sin(cam.phi);
    camera.position.set(target.x + cam.r * sp * Math.sin(cam.theta), target.y + cam.r * Math.cos(cam.phi), target.z + cam.r * sp * Math.cos(cam.theta));
    camera.lookAt(target);
  }
  function resize() {
    var w = vp.clientWidth, h = vp.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    baseR = Math.max(72, 50 / camera.aspect);
    if (!zoomed) cam.r = baseR;
    dirty = true;
  }

  /*CONTROLS*/
  var state = { anim: 0, t: 0, playing: !reduced, spin: !reduced };
  var animBox = root.querySelector('[data-anims]');
  var pauseBtn = root.querySelector('[data-act="pause"]');
  var spinBtn = root.querySelector('[data-act="spin"]');
  var scrub = root.querySelector('#rig-time');
  var timeOut = root.querySelector('#rig-clock');

  data.anims.forEach(function (a, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = a.n;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () { play(i); });
    animBox.appendChild(b);
    a.btn = b;
  });

  var lastClock = '';
  function updateClock() {
    var a = data.anims[state.anim];
    var s = state.t.toFixed(2) + ' / ' + a.l.toFixed(2) + ' S';
    if (s !== lastClock) { lastClock = s; timeOut.textContent = s; }
    scrub.value = Math.round(state.t / a.l * 1000);
  }
  function refresh() {
    data.anims.forEach(function (a, i) { a.btn.setAttribute('aria-pressed', i === state.anim ? 'true' : 'false'); });
    pauseBtn.textContent = state.playing ? 'PAUSE' : 'PLAY';
    spinBtn.setAttribute('aria-pressed', state.spin ? 'true' : 'false');
    updateClock();
    dirty = true;
  }
  function play(i) { state.anim = i; state.t = 0; state.playing = true; refresh(); }
  function setSpin(on) { state.spin = on; refresh(); }
  function zoom(f) { zoomed = true; cam.r = Math.min(170, Math.max(28, cam.r * f)); dirty = true; }
  function resetView() { cam.theta = Math.PI - 0.55; cam.phi = 1.32; zoomed = false; cam.r = baseR; dirty = true; }

  pauseBtn.addEventListener('click', function () {
    var a = data.anims[state.anim];
    if (!state.playing && state.t >= a.l && a.p !== 'loop') state.t = 0;
    state.playing = !state.playing;
    refresh();
  });
  spinBtn.addEventListener('click', function () { setSpin(!state.spin); });
  root.querySelector('[data-act="zin"]').addEventListener('click', function () { zoom(0.82); });
  root.querySelector('[data-act="zout"]').addEventListener('click', function () { zoom(1.22); });
  root.querySelector('[data-act="reset"]').addEventListener('click', resetView);
  scrub.addEventListener('input', function () {
    var a = data.anims[state.anim];
    state.playing = false;
    state.t = (scrub.value / 1000) * a.l;
    refresh();
  });

  /* Drag to rotate, pinch to zoom */
  var ptrs = {}, count = 0, pinch = 0;
  function dist() {
    var ids = Object.keys(ptrs);
    var a = ptrs[ids[0]], b = ptrs[ids[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  canvas.addEventListener('pointerdown', function (e) {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    count = Object.keys(ptrs).length;
    if (count === 2) pinch = dist();
    vp.classList.add('drag');
    if (state.spin) setSpin(false);
  });
  canvas.addEventListener('pointermove', function (e) {
    var p = ptrs[e.pointerId];
    if (!p) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (count >= 2) {
      var d = dist();
      if (pinch > 0 && d > 0) zoom(pinch / d);
      pinch = d;
    } else {
      cam.theta -= dx * 0.008;
      cam.phi = Math.min(Math.PI - 0.12, Math.max(0.12, cam.phi - dy * 0.008));
      dirty = true;
    }
  });
  function release(e) {
    delete ptrs[e.pointerId];
    count = Object.keys(ptrs).length;
    if (!count) vp.classList.remove('drag');
    pinch = 0;
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('dblclick', resetView);
  canvas.addEventListener('wheel', function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoom(Math.exp(e.deltaY * 0.01));
  }, { passive: false });
  canvas.addEventListener('keydown', function (e) {
    var used = true;
    if (e.key === 'ArrowLeft') cam.theta += 0.15;
    else if (e.key === 'ArrowRight') cam.theta -= 0.15;
    else if (e.key === 'ArrowUp') cam.phi = Math.max(0.12, cam.phi - 0.1);
    else if (e.key === 'ArrowDown') cam.phi = Math.min(Math.PI - 0.12, cam.phi + 0.1);
    else if (e.key === '+' || e.key === '=') zoom(0.9);
    else if (e.key === '-' || e.key === '_') zoom(1.1);
    else used = false;
    if (used) { e.preventDefault(); if (state.spin) setSpin(false); dirty = true; }
  });

  /*RENDER*/
  var last = 0, raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    var anim = data.anims[state.anim];
    if (state.playing) {
      state.t += dt;
      if (state.t >= anim.l) {
        if (anim.p === 'loop') { state.t %= anim.l; }
        else if (anim.p === 'hold') { state.t = anim.l; state.playing = false; refresh(); }
        else { play(0); anim = data.anims[0]; }
      }
      updateClock();
      dirty = true;
    }
    if (state.spin) { cam.theta += dt * 0.6; dirty = true; }
    /* Pull the camera back for the beam attack, unless the viewer set their own zoom. */
    if (!zoomed) {
      var goal = baseR * (/attack/i.test(anim.n) ? 1.75 : 1);
      if (Math.abs(goal - cam.r) > 0.05) { cam.r += (goal - cam.r) * Math.min(1, dt * 4); dirty = true; }
    }
    if (dirty) {
      dirty = false;
      pose(anim, state.t);
      placeCamera();
      renderer.render(scene, camera);
    }
  }
  var onScreen = true;
  function sync() {
    var run = onScreen && !document.hidden;
    if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; sync(); }).observe(vp);
  }
  document.addEventListener('visibilitychange', sync);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(vp);
  window.addEventListener('resize', resize);

  resize();
  refresh();
  pose(data.anims[0], 0);
  placeCamera();
  renderer.render(scene, camera);
  vp.classList.add('ready');
  sync();
})();
