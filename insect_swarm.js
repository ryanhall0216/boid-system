// ───────────────────────────────────────────────
// Multi-swarm insects (p5.js)
// ───────────────────────────────────────────────
const NUM_SWARMS = 2;      // try 2–4 for more flocks
const INSECTS_PER_S = 75;     // insects per swarm
const AVOID_RADIUS = 40;     // repel distance between swarms
const ALL_INSECTS = [];
const SWARM_TARGETS = [];

function setup() {
  createCanvas(800, 600);

  // wandering centre for every swarm
  for (let i = 0; i < NUM_SWARMS; i++) {
    SWARM_TARGETS.push(createVector(random(width), random(height)));
  }

  // spawn insects tagged with swarm id
  for (let sid = 0; sid < NUM_SWARMS; sid++) {
    for (let i = 0; i < INSECTS_PER_S; i++) {
      ALL_INSECTS.push(new Insect(random(width), random(height), sid));
    }
  }
}

function draw() {
  background(30);

  // drift each swarm centre with Perlin noise
  SWARM_TARGETS.forEach((t, sid) => {
    const k = frameCount * 0.002 + sid * 10;
    t.x = width / 2 + noise(k) * 200 - 100;
    t.y = height / 2 + noise(k + 100) * 150 -  75;
  });

  // update + render
  for (const ins of ALL_INSECTS) {
    ins.edges();
    ins.update();
    ins.render();
  }
}

// ─────────── Insect class ───────────
class Insect {
  constructor(x, y, swarmId) {
    this.swarm = swarmId;
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(2);
    this.acc = createVector();
    this.maxSp = 4;
    this.maxFo = 0.12;
    this.size = 6;
    this.col = color(150 + this.swarm * 50, 255 - this.swarm * 80, 220);
  }

  update() {
    const mates = ALL_INSECTS.filter(i => i.swarm === this.swarm);
    const others = ALL_INSECTS.filter(i => i.swarm !== this.swarm);

    // same-swarm behaviours
    const ali = this.align(mates).mult(1.2);
    const coh = this.cohere(mates).mult(1.0);
    const sep = this.separate(mates, 25).mult(1.8);

    // attraction to wandering centre
    const home = this.homeBias().mult(0.8);

    // avoid other swarms
    const avoid = this.separate(others, AVOID_RADIUS).mult(2.5);

    // accumulate forces
    [ali, coh, sep, home, avoid].forEach(f => this.applyForce(f));

    this.vel.add(this.acc).limit(this.maxSp);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  applyForce(f) { this.acc.add(f); }

  // ───────── flocking helpers ─────────
  align(neighbors)  { return this._steer(neighbors, n => n.vel, 50, false); }
  cohere(neighbors) { return this._steer(neighbors, n => n.pos, 60, true); }
  separate(neighbors, radius) {
    return this._steer(
      neighbors,
      n => {
        const diff = p5.Vector.sub(this.pos, n.pos);
        const d = diff.mag();
        return d ? diff.div(d * d) : createVector();
      },
      radius,
      false
    );
  }

  /**
   * Generic steering accumulator.
   *  - extractor → function returning a vector from neighbour n
   *  - radius → perception distance
   *  - subtractSelf → whether to do (avg − this.pos) for cohesion
   */
  _steer(list, extractor, radius, subtractSelf) {
    let steer = createVector();
    let total = 0;

    for (const other of list) {
      const d = p5.Vector.dist(this.pos, other.pos);
      if (other !== this && d < radius) {
        steer.add(extractor(other));
        total++;
      }
    }

    if (total) {
      steer.div(total);
      if (subtractSelf) steer.sub(this.pos);   // only cohesion
      steer.setMag(this.maxSp);
      steer.sub(this.vel);
      steer.limit(this.maxFo);
    }
    return steer;
  }

  // pull toward swarm centre
  homeBias() {
    const desired = p5.Vector
      .sub(SWARM_TARGETS[this.swarm], this.pos)
      .setMag(this.maxSp);
      
    return desired.sub(this.vel).limit(this.maxFo);
  }

  // screen-wrap
  edges() {
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.y > height) this.pos.y = 0;
    if (this.pos.y < 0) this.pos.y = height;
  }

  render() {
    noStroke();
    fill(this.col);
    ellipse(this.pos.x, this.pos.y, this.size);
  }
}
