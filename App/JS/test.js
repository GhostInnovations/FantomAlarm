const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = Math.max(document.body.clientHeight, window.innerHeight);

// Configuration
const POINT_COUNT = 100;  // Number of points
const POINT_RADIUS = 7;  // Radius of each point
const CONNECTION_DISTANCE = 400; // Max distance to draw a line between points

let points = [];

let colors = ['#BDF7B7', '#465362', '#1B998B','#F2D7EE','#FAC9B8'];

// Point class
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = POINT_RADIUS;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.velocity = {
            x: (Math.random() - 0.5) * 1,
            y: (Math.random() - 0.5) * 1
        };
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    update() {
        this.draw();
        // Movement
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Bounce off walls
        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
            this.velocity.x = -this.velocity.x;
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
            this.velocity.y = -this.velocity.y;
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
    }
}

// Initialize points
function init() {
    points = [];
    for (let i = 0; i < POINT_COUNT; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        points.push(new Point(x, y));
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    points.forEach(point => {
        point.update();
    });

    // Draw connections
    connectAllPoints(points);
}

// Connect all points with lines without intersections
function connectAllPoints(points) {
    const connections = [];

    // Create all possible connections and sort by distance
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const distance = Math.sqrt((points[i].x - points[j].x) ** 2 + (points[i].y - points[j].y) ** 2);
            if (distance < CONNECTION_DISTANCE) {
                connections.push({
                    point1: points[i],
                    point2: points[j],
                    distance: distance
                });
            }
        }
    }

    connections.sort((a, b) => a.distance - b.distance);

    // Incrementally add connections while checking for intersections
    const addedConnections = [];
    strokeColor = '#474747'
    for (const connection of connections) {
        if (!doesIntersectWithExistingConnections(connection, addedConnections)) {
            ctx.beginPath();
            ctx.moveTo(connection.point1.x, connection.point1.y);
            ctx.lineTo(connection.point2.x, connection.point2.y);
            ctx.strokeStyle = strokeColor;
            ctx.stroke();

            addedConnections.push(connection);
        }
    }
}

// Check if a new connection intersects with any existing connections
function doesIntersectWithExistingConnections(newConnection, addedConnections) {
    for (const existingConnection of addedConnections) {
        if (doesIntersect(
            newConnection.point1, newConnection.point2,
            existingConnection.point1, existingConnection.point2
        )) {
            return true;
        }
    }
    return false;
}

// Check if two line segments (p1-p2 and p3-p4) intersect
function doesIntersect(p1, p2, p3, p4) {
    function ccw(A, B, C) {
        return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    }

    return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

// Event listeners
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = Math.max(document.body.clientHeight, window.innerHeight);
    init();
});

// Start
init();
animate();
