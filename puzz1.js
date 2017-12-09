/**
 * {@link file:///C:/Users/Colin/Dropbox/Projects/Puzzle1/puzz1.html}
 */

// to prevent  "Too many errors. 95% scanned" - message
//
/*jshint maxerr: 300 */


var canvas = null;
var context = null;
var position = { x: 30, y: 30 };
var deg_rad = Math.PI / 180;
var hex_or = 20;
var hex_ir = hex_or * Math.cos(30 * deg_rad);

var board = { wid: 10, hgt: 8 }; // 10,8
var total = 16; // 16
var batches = 0;
var batch_time = 0;
var dunnit = false;
var stepping = false;
var batch = 1000000; // 10000000
var stop_it = false;
var pptr = 0;
var cells = [];
var u_boths = [1, 0, -1, -1, 0, 1];
var v_evens = [0, -1, 0, 1, 1, 1];
var v_odds = [-1, -1, -1, 0, 1, 0];
var single_piece_placed = false;


function start() {

  canvas = document.getElementById("puzzle_board");
  context = this.canvas.getContext("2d");

  for (let u = 0; u < board.wid; u++) {
    cells[u] = [];
    for (let v = 0; v < board.hgt; v++) {
      cells[u][v] = { empty: true, piece: 0 };
    }
  }

  // test only
  //
  // pieces[3].rot = 0;
  // pieces[3].uv.u = 3;
  // pieces[3].uv.v = 3;
  // try_to_place_piece_at(3);
  // draw_board();

  document.getElementById("batch").textContent = batch;
  document.getElementById("batches").textContent = batches;
  document.getElementById("status").textContent = "working";
  document.getElementById("abort").style.display = "block";

  pieces.sort(random_compare);
  pieces.sort(size_compare);

  setTimeout(do_a_batch, 0);
}

function do_a_batch() {
  let t0 = performance.now();
  let cnt = batch;
  batches++;
  while (!dunnit) {
    //
    let ok = try_to_place_piece_at(pptr);

    if (ok) {
      if (!holes_ok()) {
        remove_piece_at(pptr);
        ok = false;
      }
    }

    if (ok) {
      // move on to next piece
      //
      if (pptr < (total - 1)) {
        pptr++;
        pieces[pptr].rot = 0;
        pieces[pptr].uv = { u: 0, v: 0 };
      }
      else {
        // here we have finished and placed all pieces
        //
        console.log("Finished");
        dunnit = true;
        break;
      }
    }
    else {
      // move on or rotate if we can
      //
      if (!next_cell(pptr)) {
        // can't move on
        //
        if (pptr > 0) {
          pptr--;
          // must remove this piece
          //
          remove_piece_at(pptr);
          if (!next_cell(pptr)) {
            console.log("Failed 1");
            failed();
            dunnit = true;
            break;
          }
        }
        else {
          //
          console.log("Failed 2");
          failed();
          dunnit = true;
          break;
        }

      }
    }
    cnt--;
    if (cnt <= 0) break;

  }

  document.getElementById("batches").textContent = batches;
  let t1 = performance.now();
  batch_time += t1 - t0;
  document.getElementById("btime").textContent = Math.floor(batch_time / batches);
  document.getElementById("debug").textContent = single_piece_placed;
  draw_board();

  let deb1 = document.getElementById("stack");
  let deb2 = "";
  for (let i = 0; i < total; i++) {
    if (i <= pptr) {
      deb2 += (" " + i).slice(-2) + ":" + pieces[i].rot;
      deb2 += " " + (" " + (pieces[i].seq.length + 1)).slice(-2);
      deb2 += " " + (" " + pieces[i].uv.u).slice(-2);
      deb2 += "," + (" " + pieces[i].uv.v).slice(-2);
    }
    else {
      deb2 += (" " + i).slice(-2) + ": ";
    }
    deb2 += "<br/>";
  }
  deb1.innerHTML = deb2;


  if (!stop_it && !dunnit) {
    if (!stepping) {
      setTimeout(do_a_batch, 0);
    }
  }
  else {
    finished();
  }
}

function next_cell(pce) {
  let pc = pieces[pce];
  if (pc.uv.u < (board.wid - 1)) {
    pc.uv.u++;
    return true;
  }
  else {
    if (pc.uv.v < (board.hgt - 1)) {
      pc.uv.u = 0;
      pc.uv.v++;
      return true;
    }
    else {
      if (pc.rot < 6) {
        pc.uv.v = 0;
        pc.rot++;
        return true;
      }
      else {
        pc.uv.u = 0;
        pc.uv.v = 0;
        pc.rot = 0;
      }
    }
  }
  return false;
}


function abort() {
  stop_it = true;
}

function step() {
  if (stepping) {
    setTimeout(do_a_batch, 0);
  }
  else {
    stepping = true;
  }
}

function cont() {
  if (stepping) {
    stepping = false;
    setTimeout(do_a_batch, 0);
  }
}

function spaces_around(u, v) {
  let res = { nbr: 0, u: 0, v: 0 };
  let au = 0;
  let av = 0;

  // how many adjacent cells are empty?
  //
  for (let dir = 0; dir < 6; dir++) {
    if ((u & 1) === 0) { // even
      au = u + u_boths[dir];
      av = v + v_evens[dir];
    }
    else { // odd
      au = u + u_boths[dir];
      av = v + v_odds[dir];
    }
    if (au >= 0 && au < board.wid && av >= 0 && av < board.hgt) {
      if (cells[au][av].empty) {
        res.nbr++;
        res.u = au;
        res.v = av;
      }
    }
  }
  return res;
}

function holes_ok() {
  let au = 0;
  let av = 0;
  let singles = 0;

  for (let u = 0; u < board.wid; u++) {
    for (let v = 0; v < board.hgt; v++) {
      if (cells[u][v].empty) {
        // this is an empty cell
        // how many adjacent cells are empty?
        //
        let spc1 = spaces_around(u, v);
        if (spc1.nbr === 0) {
          // 1 empty cell on its own
          //
          if (single_piece_placed) {
            return false;
          }
          if (singles >= 1) {
            return false;
          }
          singles++;
        }
        if (spc1.nbr === 1) {
          // if that single space has only 1 space around it
          // we have a hole size 2
          //
          let spc2 = spaces_around(spc1.u, spc1.v);
          if (spc2.nbr === 1) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

function finished() {
  document.getElementById("abort").style.display = "none";
  if (stop_it) {
    document.getElementById("status").textContent = "Aborted";
  }
  else {
    document.getElementById("status").textContent = "Success";

  }
}

function failed() {
  document.getElementById("abort").style.display = "none";
  document.getElementById("status").textContent = "Failed";
}

function draw_board() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = "1";

  for (let i = 0; i < board.wid; i++) {
    for (let j = 0; j < board.hgt; j++) {
      context.strokeStyle = "#808080";
      draw_hexagon(context, uv_2_xy({ u: i, v: j }), hex_or);
      if (!cells[i][j].empty) {
        let colour = pieces[cells[i][j].piece].colour;
        context.strokeStyle = colour;
        context.fillStyle = colour;
        fill_hexagon(context, uv_2_xy({ u: i, v: j }), hex_or - 1);
      }
    }
  }

}

function try_to_place_piece_at(pce) {
  let pd = pieces[pce];
  let irot = pd.rot;

  let u = [];
  let v = [];

  for (let i = 0; i < pd.seq.length + 1; i++) {

    if (i === 0) { // starting point
      u[0] = pd.uv.u;
      v[0] = pd.uv.v;
    }
    else {
      let seq = (pd.seq[i - 1] + irot) % 6;
      if ((u[i - 1] & 1) === 0) { // even
        u[i] = u[i - 1] + u_boths[seq];
        v[i] = v[i - 1] + v_evens[seq];
      }
      else { // odd
        u[i] = u[i - 1] + u_boths[seq];
        v[i] = v[i - 1] + v_odds[seq];
      }
    }

    if (u[i] < 0 || u[i] >= board.wid || v[i] < 0 || v[i] >= board.hgt) {
      return false;
    }
    if (!cells[u[i]][v[i]].empty) {
      return false;
    }
  }
  // ok here
  if (pd.seq.length === 0) {
    single_piece_placed = true;
  }
  for (let i = 0; i < pd.seq.length + 1; i++) {
    cells[u[i]][v[i]].empty = false;
    cells[u[i]][v[i]].piece = pce;
  }
  return true;
}

function remove_piece_at(pce) {
  let pd = pieces[pce];
  let irot = pd.rot;

  let u = [];
  let v = [];

  for (let i = 0; i < pd.seq.length + 1; i++) {

    if (i === 0) { // starting point
      u[0] = pd.uv.u;
      v[0] = pd.uv.v;
    }
    else {
      let seq = (pd.seq[i - 1] + irot) % 6;
      if ((u[i - 1] & 1) === 0) { // even
        u[i] = u[i - 1] + u_boths[seq];
        v[i] = v[i - 1] + v_evens[seq];
      }
      else { // odd
        u[i] = u[i - 1] + u_boths[seq];
        v[i] = v[i - 1] + v_odds[seq];
      }
    }
  }

  if (pd.seq.length === 0) {
    single_piece_placed = false;
  }
  for (let i = 0; i < pd.seq.length + 1; i++) {
    cells[u[i]][v[i]].empty = true;
  }
}

function random_compare(a, b) {
  return 0.5 - Math.random();
}

function size_compare(a, b) {
  return b.seq.length - a.seq.length;
}

function uv_2_xy(uv) {
  var xy = { x: 0, y: 0 };

  if (uv.u % 2 === 1) {
    return {
      x: position.x + uv.u * hex_or * 1.5,
      y: position.y + uv.v * hex_ir * 2
    };
  }
  else {
    return {
      x: position.x + uv.u * hex_or * 1.5,
      y: position.y + uv.v * hex_ir * 2 + hex_ir
    };
  }
}

function draw_hexagon(ctx, cen, r) {

  ctx.beginPath();
  ctx.moveTo(cen.x + r, cen.y);
  var a = 0;
  for (var i = 0; i < 6; i++) {
    a += 60;
    ctx.lineTo(cen.x + r * Math.cos(a * deg_rad), cen.y + r * Math.sin(a * deg_rad));
  }
  ctx.stroke();
}

function fill_hexagon(ctx, cen, r) {

  ctx.beginPath();
  ctx.moveTo(cen.x + r, cen.y);
  var a = 0;
  for (var i = 0; i < 6; i++) {
    a += 60;
    ctx.lineTo(cen.x + r * Math.cos(a * deg_rad), cen.y + r * Math.sin(a * deg_rad));
  }
  ctx.closePath();
  ctx.fill();
}
