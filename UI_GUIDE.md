# 🧠 MEMORY UI - NEXUS DESIGN SYSTEM

## 🧱 Design Tokens Base

- **Checkbox Oficial**: `.nexus-checkbox` (Usar siempre con contenedor `flex items-center justify-center`).
- **Botón Simétrico**: `w-[180px] h-12 rounded-xl text-[10px] uppercase font-black`.
- **Selección de Fila**: `.nexus-row-selected` (Fondo transparente, solo indicador en checkbox).

## 🧩 Componentes Reutilizables

### 1. Botón de Acción Gris
```html
<button class="w-[180px] h-12 bg-label/10 text-label/60 border border-panel-border ...">
    <!-- Icono + Texto -->
</button>
```

### 2. Tabla Administrativa (Layout)
- Header: `bg-slate-900/50 uppercase tracking-[0.2em]`.
- Fila: `border-spacing-y-1.5 transition-all duration-300`.

## 🎨 Authelia Premium Theme
- **Path**: `deployment/authelia/themes/nexus_premium.css`
- **Concept**: Futuristic Cyberpunk / Glassmorphism.
- **Accents**: Neon Blue (`#3b82f6`) & Electric Purple (`#8b5cf6`).
- **Nginx Injection**: Add `<link>` tag via `sub_filter`.


## 📏 Reglas de Modales (Footers)

- **Simetría Obligatoria**: Todos los botones de acción en el `modal-footer` DEBEN tener el mismo ancho.
- **Ancho Estándar**: `w-[160px]` o `flex-1` balanceado, pero NUNCA mezclar anchos diferentes en el mismo footer.
- **Comportamiento Must**: Ningún botón puede ser "más ancho" que el otro por su texto; se ajusta el contenedor o se usa un ancho fijo.
- **Acciones**: Atras (Secondary), Siguiente (Primary), Finalizar (Success), Cancelar (Outline/Danger).

## 🏗️ Estructura de Modal Footer (Symmetry + Alignment)

Para lograr que los botones sean simétricos pero estén pegados a los extremos, se debe usar la siguiente estructura:

```html
<footer class="modal-footer">
    <div class="footer-left">
        <!-- Botones: Cancelar, Regresar, Anterior -->
    </div>
    <div class="footer-right">
        <!-- Botones: Siguiente, Finalizar, Guardar -->
    </div>
</footer>
```

**Reglas de Estilo:**
- `modal-footer`: `justify-content: space-between`.
- `footer-left/right`: Contenedores flex para agrupar múltiples botones en un extremo.
- **Botones**: Deben mantener el `min-width: 160px` para preservar la simetría visual.

## 🔘 Regla Global de Botones

- **Simetría Universal**: TODOS los botones del sistema (fuera y dentro de modales) deben ser simétricos en altura y, preferiblemente, en anchura dentro de su contexto.
- **Simplificación de Texto**: Si el texto es demasiado largo para el botón estándar, se DEBE simplificar el copy y utilizar un icono descriptivo para mantener la estética limpia.
- **Dimensiones Estándar**: Usar clases `nexus-btn` que heredan el estilo premium del sistema.

## 📊 Estándar de Tablas (DataTables)

Todas las tablas del sistema deben implementarse bajo el motor DataTables con las siguientes características obligatorias:
- **Diseño Zebra**: Alternancia de colores en filas para facilitar la lectura.
- **Ghost Rows (Filas Fantasma)**: Uso de `renderGhostRows` en JS para rellenar el espacio vacío y mantener el tamaño de la tabla constante.
- **Paginación Premium**: Uso del layout de paginación de Nexus (controles en el footer de la tabla, no flotantes).
- **Consistencia Visual**: No se permiten tablas nativas de HTML sin el envoltorio y estilos de DataTables del proyecto.

## 📑 Patrón de Estructura de Modales

Para mantener la consistencia, todos los modales deben seguir esta jerarquía de clases y componentes:
- **Contenedor**: `.nexus-modal` (backdrop + blur).
- **Panel**: `.modal-panel` con `max-w-4xl` por defecto para asegurar legibilidad.
- **Header**: Icono representativo + Título (cursiva/black) + Subtítulo descriptivo.
- **Body**: Padding de `p-8` con scroll personalizado (`custom-scrollbar`).
- **Footer**: Uso estricto de `.footer-left` y `.footer-right` para botones simétricos.

## 🔔 Notificaciones y Alertas

Cualquier sistema de notificación (modales de éxito, error o advertencia) debe reutilizar el mismo diseño:
- **Reutilización Obligatoria**: Si se define un estilo para una alerta de "Guardado Exitoso", ese mismo diseño (iconografía, colores, animaciones) debe replicarse en todo el sistema.
- **SweetAlert2 Config**: Usar el tema de Nexus (Glassmorphism, Dark Mode, Tipografía Inter/Black) configurado globalmente.
