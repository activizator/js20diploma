'use strict';

class Vector {
  constructor(x = 0, y = 0){
    this.x = x;
    this.y = y;
  }
  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error(`В метод Vector.plus передан не Vector`);
    }
    const newX = this.x + vector.x;
    const newY = this.y + vector.y;
    return new Vector(newX, newY);
  }
  times(factor) {
    const newX = this.x * factor;
    const newY = this.y * factor;
    return new Vector(newX, newY); 
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
      throw new Error(`В конструктор класса Actor передан не Vector`);
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }
  act() {
  }
  get type() {
    return 'actor';
  }
  get left() {
    return this.pos.x;
  }
  get right() {
    return this.pos.x + this.size.x;
  }
  get top() {
    return this.pos.y;
  }
  get bottom() {
    return this.pos.y + this.size.y
  }
  isIntersect(anotherActor) {
    if (!(anotherActor instanceof Actor)) {
      throw new Error(`В метод Actor.isIntersect не передан Actor`);
    }
    if (this === anotherActor) {
      return false;
    }   
    return this.right > anotherActor.left && 
           this.left < anotherActor.right && 
           this.top < anotherActor.bottom && 
           this.bottom > anotherActor.top;
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.actors = actors.slice();
    this.grid = grid.slice();
    this.height = this.grid.length;
    // apply можно заменить на простой вызов функции с помощью средств ES6
    let width = Math.max.apply(null, this.grid.map((row) => {
      return row.length;
    }));
    // эту проверку можно будет убрать, если добавить 0
    // в список аргументов Math.max
    // (чтобы функция не возвращала -Infinity для пустого массива)
    0 >= width ? this.width = 0 : this.width = width;
    this.status = null;
    this.finishDelay = 1;
    this.player = this.actors.find(act => act.type === 'player');
  }
  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }
  actorAt(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error(`В метод Level.actorAt не передан объект типа Actor`);
    }
    return this.actors.find(act => act.isIntersect(actor));
  }
  obstacleAt(position, size) {
    if (!(position instanceof Vector) || !(size instanceof Vector)) {
      throw new Error(`В метод Level.obstacleAt передан не Vector`);
    }
    const leftBorder = Math.floor(position.x);
    const rightBorder = Math.ceil(position.x + size.x);
    const topBorder = Math.floor(position.y);
    const bottomBorder = Math.ceil(position.y + size.y);
    if (leftBorder < 0 || rightBorder > this.width || topBorder < 0) {
      return 'wall';
    }
    if (bottomBorder > this.height) {
      return 'lava';
    }
    for (let i = topBorder; i < bottomBorder; i++) {
      for (let j = leftBorder; j < rightBorder; j++) {
        const gridLevel = this.grid[i][j];
        if (gridLevel) {
          return gridLevel;
        }
      }
    }
  }
  removeActor(actor) {
    const actorIndex = this.actors.indexOf(actor);
    if (actorIndex !== -1) {
      this.actors.splice(actorIndex, 1);
    }
  }
  noMoreActors(type) {
    // здесь лучше использоваь другой метод массива,
    // который проверяет наличие элементов, удовлетворяющих условию
    return this.actors.findIndex(act => act.type === type) < 0 ? true : false;
  }
  playerTouched(touchedEl, actor) {
    if (this.status !== null) {
      return;
    }
    if (touchedEl === 'lava' || touchedEl === 'fireball') {
      // лучше сделать 2 строчки, чтобы было видно,
      // что метод не возвращает ничего
      return this.status = 'lost';
    } 
    if (touchedEl === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        return this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(actorDictionary = {}) {
    this.actorDictionary = Object.assign({}, actorDictionary);
  }
  actorFromSymbol(letter) {
    return this.actorDictionary[letter];
  }
  obstacleFromSymbol(letter) {
    if (letter === 'x') {
      return 'wall';
    }
    if (letter === '!') {
      return 'lava';
    }
  }
  createGrid(plan) {
    // строки лучше преобразовывать в массивы с помощью метода split
    // так сразу видно, что работа идёт со строкой
    return plan.map(stArr => [...stArr]).map(stLine => stLine.map(stChar => this.obstacleFromSymbol(stChar)));
  }
  createActors(plan) {
    // если использовать reduce можно будет избавится от переменной result
    let result = [];
    plan.map((stArr) => [...stArr])
      .map((stLine, y) => stLine.map((stChar, x) => {
        console.log(y);
        const constr = this.actorFromSymbol(stChar);
        if (typeof constr === 'function') {
          const actor = new constr(new Vector(x, y));
          if (actor instanceof Actor) {
            result.push(actor);
          }
        }
    }));
    return result;
  }
  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
     super(pos, new Vector(1, 1), speed);
  }
  get type() {
    return 'fireball';
  }
  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }
  handleObstacle() {
    this.speed = this.speed.times(-1);
  }
  act(time, level) {
    const nextPos = this.getNextPosition(time);
    if (level.obstacleAt(nextPos, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPos
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 3));
    this.startPos = this.pos;
  }
  handleObstacle() {
    this.pos = this.startPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.spring = Math.random() * (2 * Math.PI);
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.startPos = this.pos;
  }
  get type() {
    return 'coin';
  }
  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }
  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist)
  }
  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.startPos.plus(this.getSpringVector());
  }
  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
  }
  get type() {
    return 'player';
  }
}




//const schemas = loadLevels();
const schemas = [
  [
    "     v                 ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "  |                    ",
    "  o                 o  ",
    "  x               = x  ",
    "  x          o o    x  ",
    "  x  @       xxxxx  x  ",
    "  xxxxx             x  ",
    "      x!!!!!!!!!!!!!x  ",
    "      xxxxxxxxxxxxxxx  ",
    "                       "
  ],
  [
    "        |           |  ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "     |                 ",
    "                       ",
    "         =      |      ",
    " @ |  o            o   ",
    "xxxxxxxxx!!!!!!!xxxxxxx",
    "                       "
  ],
  [
    "                       ",
    "                       ",
    "                       ",
    "    o                  ",
    "    x      | x!!x=     ",
    "         x             ",
    "                      x",
    "                       ",
    "                       ",
    "                       ",
    "               xxx     ",
    "                       ",
    "                       ",
    "       xxx  |          ",
    "                       ",
    " @                     ",
    "xxx                    ",
    "                       "
  ], [
    "   v         v",
    "              ",
    "         !o!  ",
    "              ",
    "              ",
    "              ",
    "              ",
    "         xxx  ",
    "          o   ",
    "        =     ",
    "  @           ",
    "  xxxx        ",
    "  |           ",
    "      xxx    x",
    "              ",
    "          !   ",
    "              ",
    "              ",
    " o       x    ",
    " x      x     ",
    "       x      ",
    "      x       ",
    "   xx         ",
    "              "
  ]
];

const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,

}
const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
  .then(() => console.log('Вы выиграли приз!'));
