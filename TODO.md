# TODO - Quincho FIUNA

## 🚧 En progreso

### Suprimir notificación al crear una reserva (solo para el creador)
Descripción: Actualmente, al crear una reserva el usuario ve la notificación "El calendario se ha actualizado con nuevas reservas". Queremos mantener esa notificación para cambios en tiempo real provocados por otros usuarios o por acciones administrativas, pero suprimirla cuando la reserva ha sido creada por el mismo usuario que está viendo el calendario.

Plan de implementación:
- Añadir un indicador/contexto que marque la acción reciente del usuario (por ejemplo: `justCreatedReservation`).
- En `src/components/calendar/hooks/useReservationUpdates.ts` comprobar ese indicador antes de mostrar la notificación.
- Limpiar el indicador tras un pequeño intervalo (p. ej. 3-5 segundos) para que las futuras actualizaciones muestren la notificación normalmente.
- Asegurarse de que la lógica no suprima notificaciones legítimas procedentes de otros usuarios o de cambios administrativos.

### Bloques continuos para reservas en el calendario
Descripción: Las reservas que abarcan varios intervalos de tiempo aparecen fragmentadas en varias tarjetas en lugar de mostrarse como un único bloque continuo. Se intentó una implementación previa, pero se revirtió por problemas de maquetación.

Estado actual: implementación en progreso pero pendiente de una solución estable.

Retos identificados:
- La cuadrícula actual (grid) no admite de forma sencilla un `row-span` dinámico según la duración de la reserva.
- La posición absoluta provoca problemas de alineación entre celdas.
- Las vistas (día/semana/mes) utilizan estructuras diferentes, por lo que la solución debe ajustarse a cada una.

Opciones a probar (priorizadas):
1. Usar flexbox con alturas calculadas por duración (más controlable que intentar spans dinámicos en grid).
2. Renderizar celdas “placeholder” para los intervalos continuados y dibujar la tarjeta solo en la celda inicial (acompañado de posicionamiento relativo/absoluto calculado).
3. Definir explícitamente filas en CSS Grid (grid-template-rows) para poder usar `grid-row: span N` con N calculado.
4. Si el anterior sigue fallando, plantear un rediseño del renderer de franja horaria para un enfoque por horas/segmentos más robusto.

---

## 📝 Mejoras futuras (priorizadas)

### Migración completa del enumerado `status` (eliminar `approved` legado)
Descripción: Actualmente coexisten la columna `status` (enum con valores: `pending`/`approved`/`rejected`/`cancelled`) y la columna binaria `approved` (legado). Hay lógica que revisa ambas y esto genera complejidad.

Estado actual:
- ✅ El enum `reservation_status` está definido y la columna `status` está en uso.
- ⚠️ La columna `approved` sigue presente y el código mantiene fallbacks.

Pasos propuestos para completar la migración (opción recomendada: migración completa):
1. Código frontend
   - Eliminar parámetros/uso de `approved` en: `src/utils/reservationStyles.ts` y componentes que hagan fallback a esa propiedad.
2. Tipados TypeScript
   - Eliminar `approved?: boolean` de `src/types/reservation.ts` y del cliente de Supabase generado si aplica.
3. Migración de base de datos
   - Añadir una migración para eliminar la columna `approved` cuando el backend esté listo:

```sql
ALTER TABLE public.reservations DROP COLUMN IF EXISTS approved;
```

4. Pruebas
   - Revisar flujos de creación, confirmación y aprobación de reservas.
   - Verificar visualizaciones en calendario (mes/semana/día) y listas administrativas.

Beneficios al completar esto:
- Código más limpio y fácil de mantener.
- Única fuente de la verdad en el `status`.


---

Si quieres, puedo:
- Implementar la supresión de la notificación para el usuario que crea la reserva (modificar `useReservationUpdates.ts` y añadir el flag en el flujo de creación).
- Volver a intentar implementar bloques continuos para las vistas (te propongo la opción 1 o 2 y la ajusto hasta que quede estable).

Indica qué tarea quieres que priorice y la implemento a continuación.


```
TODO
1.	Create a form to replace the current report an issue google form
2.	Make the calendar not go up or down on the booking page
3.	Remove the "El calendario se ha actualizado con nuevas reservas" or something popup that appears when creating a booking
4.	Fix the start and end times in the booking form to be from 8 to 22 and add configuration to admin dashboard to be able to change these at any time.
5.	Implement custom password-changed email trigger (currently uses Supabase default template without timestamp)

DONE
1.	Add reset password screen, and if possible configure new domain (quincho.cpfiuna.io)
2.	Email notifications with Resend (what we're already working on) - reduces admin/user back-and-forth
3.	Admin notes/rejection reason - you already have admin_notes, so this is covered
4.	Remove excesive logging from the console, keep it clean
5.	Audit trail on reservations (updated_at, updated_by) - track when admins modified bookings
6.	Cleanup of duplicate RLS policies - just housekeeping
7.	Check constraints on time validation (fin > inicio, personas > 0) - prevents data entry errors
8.	Foreign key on blocked_dates.created_by → profiles(id) - know which admin blocked dates
9.	When on the page after clicking the confirm link, let the user advance himself instead of a timed redirect, and can the email that one receives to confirm/or the one after confirming, whichever has the booking information, show the same information as the page in question
10.	When creating the reservation, we get the notification, all fields clear, and THEN we get sent to the /calendar view, it should be instant
11.	Status enum instead of just approved boolean (pending/approved/rejected/cancelled) - clearer state management MORE COULD BE DONE, KEEP AS IS FOR NOW
12.	Make the motive for the reservations begin left side of the text
```