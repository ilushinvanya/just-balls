const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
canvas.width = window.innerWidth
canvas.height = window.innerHeight

let balls = [];
const mouse = {
	x: undefined,
	y: undefined
}
let newId = 1
const randomNumber = (minimum, maximum) => Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
const symbols = ['🤪','😵‍💫', '⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🎱', '🎲'];
const randomSymbol = () => symbols[randomNumber(0, symbols.length - 1)]

const calcGeometry = (x0, y0, x1, y1) => {
	const width = x1 - x0;
	const height = y0 - y1;
	return {
		hypotenuse: Math.sqrt(width**2 + height**2),
		angle: Math.atan2(height, width)
	}
}

addEventListener('mousemove', event => {
	mouse.x = event.clientX
	mouse.y = event.clientY
})

addEventListener('mousedown', () => {
	cursor.visible = true;
	cursor.x0 = mouse.x;
	cursor.y0 = mouse.y;
})

addEventListener('mouseup', () => {
	const { angle, hypotenuse } = calcGeometry(cursor.x0, cursor.y0, mouse.x, mouse.y)
	const velocity = hypotenuse / 1.4;
	const freshBall = new Ball(newId, cursor.x0, cursor.y0, velocity, angle, randomSymbol(), 20 + Math.random() * 10)
	balls.push(freshBall)

	newId++;
	cursor.visible = false;
	cursor.x0 = 0;
	cursor.y0 = 0;
})

class Cursor {
	constructor(visible, x0, y0) {
		this.visible = visible
		this.x0 = x0
		this.y0 = y0
	}
	draw() {
		if(!this.visible) return;
		c.beginPath()
		c.moveTo(this.x0, this.y0)
		c.lineTo(mouse.x, mouse.y)
		c.stroke()
		c.closePath()
	}
}
const cursor = new Cursor(false, 0,0);


G = 9.8
DeltaT = 0.1
class Ball {
	prevCollision = false
	ballWithCollision = {}
	constructor(newId, startX, startY, velocity, radian, symbol, symbolRadius) {
		this.r = symbolRadius
		this.id = newId
		this.startX = startX
		this.startY = startY
		this.x = 0
		this.y = 0
		this.t = 0
		this.startVelocity = velocity
		this.radian = radian
		this.symbol = symbol
		this.currentVelocity = 0
		this.currentRadian = 0
		this.verticalCollapse = 0
		this.horizontalCollapse = 0
	}
	draw() {
		c.beginPath()
		c.font = `${this.r * 2}px serif`;
		// c.arc(this.x, this.y, this.r, 0, Math.PI * 2)
		// let collapse = 0
		// if(this.verticalCollapse) verticalCollapse = 1
		// if(this.horizontalCollapse) horizontalCollapse = 1
		c.ellipse(this.x, this.y, this.r - this.horizontalCollapse, this.r - this.verticalCollapse,  Math.PI,0, Math.PI * 2)
		if(this.verticalCollapse > 0 ) {
			this.verticalCollapse--
		}
		if(this.horizontalCollapse > 0 ) {
			this.horizontalCollapse--
		}
		c.fillStyle = this.prevCollision ? 'red' : 'black'
		c.fill()
		c.closePath()
	}
	update() {
		const speed = this.startVelocity;

		this.t = this.t + DeltaT;
		const time = this.t

		const oldX = this.x
		const oldY = this.y

		this.x = this.startX + speed * Math.cos(this.radian) * time
		this.y = this.startY + -1 * speed * Math.sin(this.radian) * time + (G * time**2) / 2

		const newX = this.x
		const newY = this.y

		const { angle, hypotenuse } = calcGeometry(oldX, oldY, newX, newY)
		this.currentRadian = angle
		this.currentHypotenuse = hypotenuse

		this.currentVelocity = (hypotenuse / 1.4) / DeltaT

		const leftSide = this.x - this.r < 0
		const rightSide = this.x + this.r > canvas.width
		const bottomSide = this.y + this.r > canvas.height

		if(rightSide || leftSide) {
			this.startVelocity = this.currentVelocity
			this.t = 0
			this.radian = Math.PI - angle
			this.startY = this.y

			if(rightSide)   this.startX = canvas.width - this.r
			if(leftSide)    this.startX = this.r
			this.horizontalCollapse = this.currentVelocity / 10
		}
		if(bottomSide) {
			this.startVelocity = this.currentVelocity
			this.t = 0
			this.radian = 2 * Math.PI - angle
			this.startX = this.x
			this.startY = canvas.height - this.r
			if(this.startVelocity < 0.4) {
				this.startVelocity = 0
			}
			this.verticalCollapse = this.currentVelocity / 10
		}

		let prevNotCollisionT = 0
		let prevNotCollisionTball = 0

		// Столкновение мячиков между собой
		const isCollision = balls.some(ball => {
			if (ball.id === this.id) return false
			const d = Math.sqrt((ball.x - this.x)**2 + (ball.y - this.y)**2)
			if(d < this.r + ball.r) {
				prevNotCollisionT = this.t - DeltaT
				prevNotCollisionTball = ball.t - DeltaT
				this.ballWithCollision = ball
				return true
			}
		})
		// isCollision - коллизия сейчас
		// this.prevCollision - коллизия кадр назад
		// не сейчас и не пред - ничего не делаем просто летим дальше
		//

		// не сейчас и пред - делаем баунс
		if(!isCollision && this.prevCollision) {
			this.bounce(this.ballWithCollision)
			// this.prevCollision = isCollision
			// this.draw()
			// return
		}

		// сейчас и пред - ошибка, откатываемся еще
		else if(isCollision && this.prevCollision) {
			// this.t = this.t - 2 * DeltaT;
			// this.update()
			// return
			this.t = 0
			console.log(isCollision && this.prevCollision)
		}

		// сейчас и нет пред - откатываемся и перерисовываемся
		else if(isCollision && !this.prevCollision) {
			this.t = this.t - 2 * DeltaT;
			// this.update()
			// return
		}
		else if(!isCollision && !this.prevCollision) {
			this.ballWithCollision = {}
		}
		this.prevCollision = isCollision
		this.draw()
	}
	bounce(ball, newangle, prevNotCollisionTball, prevNotCollisionT) {
		// this.draw()
		this.t = 0
		this.startVelocity = this.currentVelocity
		this.radian = Math.PI - this.currentRadian
		this.startY = this.y
		this.startX = this.x
		// this.horizontalCollapse = this.currentVelocity / 10

		// ball.t = prevNotCollisionTball
		// ball.draw()
		ball.startVelocity = ball.currentVelocity
		ball.t = 0
		ball.radian = Math.PI - ball.currentRadian
		ball.startY = ball.y
		ball.startX = ball.x
		// ball.horizontalCollapse = ball.currentVelocity / 10
		return;
		const m = this.r
		const v1 = this.currentVelocity
		const v2 = ball.currentVelocity
		const t = this.t
		// Рассчитайте импульсы шаров до столкновения
		const p1 = m * v1;
		const p2 = m * v2;

		// Рассчитайте импульсы шаров после столкновения
		const p1After = (p1 * (m - m) + 2 * m * p2) / (m + m);
		const p2After = (p2 * (m - m) + 2 * m * p1) / (m + m);

		// Рассчитайте скорости шаров после столкновения
		const v1After = p1After / m;
		const v2After = p2After / m;

		// const theta = Math.atan2(v2_yBefore, v2_xBefore);
		const v2_xBefore = v1 * Math.cos(theta);
		// Рассчитайте скорость второго шара по оси x

		// Рассчитайте угол между вектором скорости второго шара и осью x


		// Здесь theta - это угол между вектором скорости второго шара до столкновения и осью x, который можно рассчитать с помощью функции Math.atan2:
		// Рассчитайте компоненты вектора скорости второго шара
		const theta = Math.atan2(v2_yBefore, v2_xBefore);
		const v2_x = v2After * Math.cos(theta);
		const v2_y = v2After * Math.sin(theta);

		// Рассчитайте угол, под которым шары движутся после столкновения
		const alpha = Math.atan(v2_y / v2_x);


		// где v2_xBefore и v2_yBefore - компоненты вектора скорости второго шара до столкновения.

		// Рассчитайте угол, под которым шары движутся после столкновения
		const angle = Math.atan(v2_y / v2_x);

		// Рассчитайте траектории движения шаров
		const trajectory1 = {
			x: this.x,
			y: this.y,
			vx: v1After * Math.cos(angle),
			vy: v1After * Math.sin(angle) - G * t // учитываем ускорение свободного падения
		};
		const trajectory2 = {
			x: ball.x,
			y: ball.y,
			vx: v2After * Math.cos(angle),
			vy: v2After * Math.sin(angle) - G * t // учитываем ускорение свободного падения
		};

		// Рассчитайте новые траектории движения шаров с учетом движения по траектории
		const newTrajectory1 = {
			x: trajectory1.x + trajectory1.vx * t,
			y: trajectory1.y + trajectory1.vy * t
		};
		const newTrajectory2 = {
			x: trajectory2.x + trajectory2.vx * t,
			y: trajectory2.y + trajectory2.vy * t
		};

		// Определите, пересекаются ли траектории движения шаров
		const distance = Math.sqrt((newTrajectory1.x - newTrajectory2.x) ** 2 + (newTrajectory1.y - newTrajectory2.y) ** 2);
		const radiusSum = this.r + ball.r;
		const collision = distance <= radiusSum;

		// Если траектории пересекаются, то шары столкнулись еще раз
		if (collision) {
			// Рассчитайте новые скорости и траектории движения шаров после второго столкновения
			// Повторите шаги 2-6
		}
	}
	destroy() {
		balls = balls.filter(ball => ball.id !== this.id)
	}
}

function animate() {
	requestAnimationFrame(animate)
	c.clearRect(0, 0, canvas.width, canvas.height)
	balls.forEach(ball => {
		ball.update()
	})
	cursor.draw()
}

animate()
function motion(event){
	console.log("Accelerometer: "
		+ event.accelerationIncludingGravity.x + ", "
		+ event.accelerationIncludingGravity.y + ", "
		+ event.accelerationIncludingGravity.z
	);
}
if(window.DeviceMotionEvent){
	window.addEventListener("devicemotion", motion, false);
}else{
	console.log("DeviceMotionEvent is not supported");
}
function orientation(event){
	console.log("Magnetometer: "
		+ event.alpha + ", "
		+ event.beta + ", "
		+ event.gamma
	);
}
if(window.DeviceOrientationEvent){
	DeviceOrientationEvent.requestPermission()
	window.addEventListener("deviceorientation", orientation, false);
}else{
	console.log("DeviceOrientationEvent is not supported");
}