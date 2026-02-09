# Backend Cosaif

Este es el sistema backend para la gestión operativa ferroviaria "Cosaif". Está construido utilizando **Node.js**, **Express**, y **Prisma** con una base de datos **PostgreSQL**.

El sistema administra la logística de movimientos de locomotoras, gestión de infraestructura de vías, reporte de incidentes y control de usuarios, proporcionando una API RESTful robusta y segura.

## 🚀 Tecnologías Principales

*   **Runtime**: Node.js
*   **Framework**: Express
*   **ORM**: Prisma
*   **Base de Datos**: PostgreSQL
*   **Autenticación**: JWT (JSON Web Tokens), Passport, Argon2
*   **Notificaciones**: Firebase Admin SDK (FCM)
*   **Manejo de Archivos**: Multer, Sharp (optimización de imágenes)
*   **Logging**: Winston (rotación diaria de logs)
*   **Validación**: Zod
*   **Tareas Programadas**: Node-cron

## a ✨ Características Clave

### 1. Gestión de Usuarios y Autenticación
*   **Roles y Permisos**: Administradores, Coordinadores, Operadores, Maquinistas.
*   **Seguridad**: Hashing de contraseñas con `argon2` y autenticación vía JWT.
*   **Notificaciones**: Integración con Firebase Cloud Messaging para alertas en tiempo real.

### 2. Operativa de Movimientos
*   **Máquina de Estados**: Control preciso del ciclo de vida de un movimiento (`SOLICITADO`, `EN_PROCESO`, `DETENIDO`, `CONCLUIDO`, `CANCELADO`).
*   **Prioridades**: Gestión de colas de prioridad (`ALTA`, `BAJA`).
*   **Servicios Especiales**: Colas dedicadas para servicios de Lavado y Torno.
*   **Metadatos**: Procesamiento de instrucciones complejas para automatización de tareas.

### 3. Infraestructura de Vías
*   **Modelado Flexible**: Soporte para vías simples y vías seccionadas (subdivididas).
*   **Control de Ocupación**: Prevención de colisiones y doble asignación.
*   **Asignación Inteligente**: Búsqueda automática de secciones libres.

### 4. Gestión de Incidentes
*   **Reportes**: Registro detallado de fallos operativos.
*   **Ciclo de Vida**: Flujo de estados (`ABIERTO`, `RESUELTO`, `CERRADO`) con tiempos de verificación.
*   **Evidencia**: Carga y optimización de imágenes asociadas a los incidentes.

## 🛠️ Instalación y Configuración

1.  **Clonar el repositorio**
    ```bash
    git clone <url-del-repo>
    cd BackCosaif
    ```

2.  **Instalar dependencias**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno**
    Crea un archivo `.env` en la raíz del proyecto basado en la configuración de Prisma y tus secretos. Ejemplo de variables requeridas:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/db"
    PORT=3000
    JWT_SECRET="tu_secreto_super_seguro"
    # Otras configuraciones para Firebase, etc.
    ```

4.  **Inicializar la Base de Datos (Prisma)**
    ```bash
    npx prisma generate
    npx prisma migrate dev
    ```

## ▶️ Ejecución

### Desarrollo
Para levantar el servidor en modo desarrollo con recarga automática (`ts-node-dev`):
```bash
npm run dev
```

### Producción
Para compilar el proyecto a JavaScript:
```bash
npm run build
```
El resultado se generará en la carpeta `dist`.

## 📂 Estructura del Proyecto

*   `src/Controller`: Controladores de la API (lógica de entrada/salida).
*   `src/models`: Modelos de negocio y lógica de datos.
*   `src/Rutas`: Definición de endpoints y enrutamiento.
*   `src/middlewares`: Middlewares de autenticación, validación y manejo de errores.
*   `prisma/schema.prisma`: Definición del esquema de la base de datos.
*   `libs`: Librerías y utilidades compartidas.

## 📄 Documentación Adicional

Para más detalles sobre la arquitectura, endpoints específicos y lógica de negocio, consulta el archivo [DOCUMENTACION_SISTEMA.md](./DOCUMENTACION_SISTEMA.md).
