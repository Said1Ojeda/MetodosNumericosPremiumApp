// biblioteca de ejemplos, los mismos de la version en MATLAB mas casos de aplicacion

export interface EjemploNewton {
  nombre: string
  ecuaciones: string
  x0: number[]
  tolerancia: number
  maxIteraciones: number
  descripcion: string
  aplicacion?: boolean
}

export interface EjemploLineal {
  nombre: string
  A: number[][]
  b: number[]
  descripcion: string
  aplicacion?: boolean
}

export const EJEMPLOS_NEWTON: EjemploNewton[] = [
  {
    nombre: 'Circunferencia y recta',
    ecuaciones: 'x^2 + y^2 = 25\ny = 0.75*x + 1',
    x0: [4, 4],
    tolerancia: 1e-6,
    maxIteraciones: 50,
    descripcion: 'Intersección de una circunferencia de radio 5 con una recta.'
  },
  {
    nombre: 'Sistema trigonométrico',
    ecuaciones: 'sin(x) + y^2 - 1\nx^2 + y - 1',
    x0: [0.7, 0.5],
    tolerancia: 1e-7,
    maxIteraciones: 60,
    descripcion: 'Seno mezclado con términos cuadráticos.'
  },
  {
    nombre: 'Tipo Rosenbrock',
    ecuaciones: '2*(x - 1) + 400*x*(x^2 - y)\n200*(y - x^2)',
    x0: [-1.2, 1],
    tolerancia: 1e-6,
    maxIteraciones: 100,
    descripcion: 'Gradiente de la función de Rosenbrock, el valle famoso de optimización.'
  },
  {
    nombre: 'Cúbica y circunferencia',
    ecuaciones: 'x^3 - y + 1\nx^2 + y^2 - 4',
    x0: [1, 1.5],
    tolerancia: 1e-6,
    maxIteraciones: 70,
    descripcion: 'Varias intersecciones, ideal para el mapa de convergencia.'
  },
  {
    nombre: 'Brazo robótico (cinemática inversa)',
    ecuaciones: '2*cos(x) + 1.5*cos(x + y) = 2.5\n2*sin(x) + 1.5*sin(x + y) = 1.5',
    x0: [0.3, 0.8],
    tolerancia: 1e-8,
    maxIteraciones: 50,
    descripcion:
      'Brazo de dos eslabones (2 m y 1.5 m). x y y son los ángulos de las articulaciones en radianes para que la punta llegue al punto (2.5, 1.5).',
    aplicacion: true
  },
  {
    nombre: 'Esfera y planos',
    ecuaciones: 'x^2 + y^2 + z^2 - 9\nx + y + z - 3\nx - y + z - 1',
    x0: [2, 1, 0],
    tolerancia: 1e-6,
    maxIteraciones: 80,
    descripcion: 'Intersección de una esfera con dos planos, se ve muy bien en 3D.'
  },
  {
    nombre: 'Sistema exponencial',
    ecuaciones: 'x^2 + y^2 - 4\ny + z - 1\nexp(x) + z - 3',
    x0: [1, 1, 0],
    tolerancia: 1e-6,
    maxIteraciones: 80,
    descripcion: 'Tres incógnitas con una exponencial.'
  },
  {
    nombre: 'Equilibrio no lineal',
    ecuaciones: 'x^2 + y^2 + z^2 - 6\nx*y - z - 1\nx + y - z - 1',
    x0: [0.5, -1.5, -2],
    tolerancia: 1e-6,
    maxIteraciones: 80,
    descripcion: 'Sistema de equilibrio con tres incógnitas.'
  },
  {
    nombre: 'Localización GPS (trilateración)',
    ecuaciones:
      '(x - 1)^2 + (y - 2)^2 + (z - 3)^2 = 9\n(x - 6)^2 + (y - 1)^2 + z^2 = 22\n(x - 2)^2 + (y - 7)^2 + (z - 1)^2 = 11',
    x0: [2, 3, 1],
    tolerancia: 1e-8,
    maxIteraciones: 50,
    descripcion:
      'Un receptor mide su distancia a tres antenas. Newton encuentra la posición (x, y, z) que cumple las tres distancias al mismo tiempo.',
    aplicacion: true
  }
]

export const EJEMPLOS_LINEALES: EjemploLineal[] = [
  {
    nombre: 'Sistema 3×3 clásico',
    A: [
      [4, -1, 0],
      [-1, 4, -1],
      [0, -1, 3]
    ],
    b: [15, 10, 10],
    descripcion: 'Sistema tridiagonal clásico.'
  },
  {
    nombre: 'Dos rectas',
    A: [
      [2, 1],
      [1, -1]
    ],
    b: [5, 1],
    descripcion: 'La solución es el punto donde se cruzan las dos rectas.'
  },
  {
    nombre: 'Tres planos',
    A: [
      [1, 1, 1],
      [2, -1, 1],
      [1, 2, -1]
    ],
    b: [6, 3, 3],
    descripcion: 'Tres planos que se cortan en un solo punto.'
  },
  {
    nombre: 'Circuito por mallas',
    A: [
      [10, -2, 0],
      [-2, 8, -1],
      [0, -1, 5]
    ],
    b: [12, 7, 4],
    descripcion: 'Ley de voltajes de Kirchhoff en tres mallas. La solución son las corrientes I1, I2, I3 en amperios.',
    aplicacion: true
  },
  {
    nombre: 'Sistema 4×4',
    A: [
      [6, -2, 1, 0],
      [-2, 7, -1, 1],
      [1, -1, 5, -2],
      [0, 1, -2, 4]
    ],
    b: [9, -3, 8, 2],
    descripcion: 'Cuatro incógnitas, se compara sin gráfica de planos.'
  },
  {
    nombre: 'Armadura estructural',
    A: [
      [12, -3, 0, 0],
      [-3, 10, -2, 0],
      [0, -2, 8, -1],
      [0, 0, -1, 6]
    ],
    b: [20, 15, 10, 5],
    descripcion: 'Matriz de rigidez de una estructura simple, la solución son los desplazamientos de los nodos.',
    aplicacion: true
  },
  {
    nombre: 'Placa de calor 5×5',
    A: [
      [4, -1, 0, 0, 0],
      [-1, 4, -1, 0, 0],
      [0, -1, 4, -1, 0],
      [0, 0, -1, 4, -1],
      [0, 0, 0, -1, 4]
    ],
    b: [100, 100, 100, 100, 100],
    descripcion: 'Discretización de la ecuación de calor, las incógnitas son temperaturas en puntos internos.',
    aplicacion: true
  },
  {
    nombre: 'Requiere pivoteo',
    A: [
      [0, 2, 1],
      [1, -2, -3],
      [-1, 1, 2]
    ],
    b: [-8, 0, 3],
    descripcion: 'El primer pivote es cero, sin pivoteo parcial el método truena.'
  }
]
