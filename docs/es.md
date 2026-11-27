# Biatlón IBU

Siga el biatlón en Gladys con los datos oficiales de la Unión Internacional de
Biatlón (datacenter de la IBU, los datos de biathlonresults.com): fechas y
horas de las próximas carreras, clasificaciones de la Copa del Mundo / IBU
Cup, resultados y estadísticas de tiro de sus atletas favoritos.

Es una integración **cloud**: los datos vienen de Internet, nada se ejecuta en
su red local.

## 1. Obtener una clave de API de la IBU

El datacenter de la IBU solo responde a las peticiones con una clave de API
(cabecera `apikey`). Dos maneras de obtenerla:

- **Una clave personal** — pida a la IBU acceso a la API de su datacenter (ver
  [biathlonworld.com](https://www.biathlonworld.com/contact)). Es la opción
  más limpia.
- **La clave del sitio público** — biathlonresults.com envía una clave en cada
  petición de su navegador. Para leerla:
  1. abra <https://www.biathlonresults.com> en un navegador de escritorio;
  2. pulse **F12** y abra la pestaña **Red**;
  3. recargue la página (**F5**);
  4. escriba `sportapi` en el filtro y haga clic en una petición (`Events`,
     `Competitions`…);
  5. en **Encabezados → Encabezados de solicitud**, copie el valor de
     `apikey`.

  Esta clave pertenece al sitio de la IBU y puede cambiar en cualquier
  momento: si la integración indica «La API de la IBU rechazó la clave
  (401)», vuelva a leerla. Úsela con moderación y solo para uso personal.

Gladys guarda la clave como secreto; solo se envía a biathlonresults.com y
nunca se escribe en los registros.

## 2. Configurar la integración

1. Abra la pestaña **Configuración** de la integración.
2. Pegue la **clave de API de la IBU** y pulse **Probar la conexión IBU**.
3. **Atletas seguidos**: pulse **Buscar un atleta**, escriba un apellido y
   copie el IBU ID mostrado en el campo. Separe varios ID con comas (20 como
   máximo).
4. Elija el **nivel de competición** (Copa del Mundo por defecto), el
   **idioma** de los textos, su **zona horaria**, el **intervalo de
   actualización** (15 minutos por defecto, mínimo 5) y el **aviso antes de
   carrera** (30 minutos por defecto).
5. Guarde: los dispositivos aparecen en la pestaña **Descubrimiento**.

## Dispositivos

- **Calendario de biatlón** — próxima carrera (nombre, sede, fecha y hora),
  minutos hasta la próxima carrera, último ganador.
- **Clasificación de biatlón — Hombres / Mujeres** — líder de la general y sus
  puntos.
- **Biatleta _nombre_** (uno por atleta seguido) — puesto y puntos en la
  general, precisión de tiro de la temporada (total, tendido, de pie, en %),
  puesto y resultado de la última carrera.

La precisión se calcula sobre las carreras individuales de la temporada
(sprint, persecución, individual, salida en masa), 5 blancos por tirada. Los
relevos quedan excluidos (cartuchos de reserva).

## Widgets del panel

- **Próximas carreras de biatlón** — fecha y hora, un aviso poco antes de la
  salida y **EN DIRECTO** durante la carrera.
- **Clasificación de biatlón** — general, sprint, persecución, individual,
  salida en masa o copa de naciones, podio, top 5 o top 10, atletas seguidos
  en verde.
- **Biatleta** — un atleta seguido, elegido escribiendo parte de su nombre o
  su IBU ID (vacío: el primer atleta seguido): puesto, puntos, precisión de
  tiro, tendido y de pie, última carrera.
- **Últimos resultados de biatlón** — podio de la última carrera y puestos de
  los atletas seguidos.

## Escenas

Disparadores: **Carrera de biatlón a punto de empezar**, **Resultados de una
carrera de biatlón**, **Resultado de un atleta seguido**, **Nuevo líder de la
general**. Acciones: **Obtener la próxima carrera de biatlón**, **Obtener las
estadísticas de un atleta**, **Obtener el líder de una clasificación**,
**Actualizar los datos de biatlón**. Las variables se describen en la
documentación en inglés.

## Solución de problemas

- **Clasificación o estadísticas de la temporada pasada** — hasta la primera
  carrera de una nueva temporada, la clasificación, las estadísticas de tiro y
  la última carrera son las de la temporada anterior; cambian unos 30 minutos
  después de la salida de la primera carrera. Los widgets de clasificación y
  de atleta indican la temporada.
- **«La API de la IBU rechazó la clave (401)»** — clave incorrecta o caducada:
  obtenga una nueva (paso 1).
- Consulte los registros de la integración en Gladys (`LOG_LEVEL=debug`).

Los datos pertenecen a la IBU. Esta integración no está afiliada a la IBU.
