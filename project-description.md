# Klai

**La primera interfaz que se genera sola sobre cualquier video.**

No navegas menús ni tocas botones: le hablas (o escribes) y Klai construye, encima de lo que estás viendo, exactamente el widget que necesitas.

## El problema

Estás viendo un partido y quieres saber el marcador, las estadísticas o quién va ganando. Hoy abres otra pestaña, buscas, y pierdes el hilo del juego. La interfaz te obliga a adaptarte a ella.

## La idea

Klai lo invierte: **la interfaz se adapta a tu intención**. Hablas, Klai lee el cuadro actual del video para entender el contexto, y materializa el widget justo, sin configuración, sobre el mismo video.

## Cómo funciona

1. Pides algo por voz o texto.
2. Klai captura el cuadro visible y lo entiende con IA (Claude, visión).
3. Genera widgets animados, compuestos sobre el video y ubicados para no tapar la acción.

## En deportes (lo que ya está probado al 100%)

Mientras ves un partido, le puedes decir:

- **"¿Cómo va el marcador?"** — aparece un marcador en vivo con los equipos y el minuto.
- **"¿Quién va ganando?"** — una barra de probabilidad de victoria.
- **"Muéstrame las tarjetas"** — un panel con las amarillas y rojas de cada equipo.
- **"¿En qué minuto van?"** — el reloj del partido.
- **"Pon un cronómetro de 10 minutos"** — un temporizador encima del video.
- **"Dame el resumen del partido"** — varios widgets a la vez: marcador, estadísticas y el último evento.

Y además:

- **Llena los huecos**: cuando la transmisión esconde su propio marcador (un replay, una toma de la tribuna), Klai muestra el suyo con el último resultado conocido. Cuando la transmisión lo vuelve a mostrar, el de Klai se quita para no estorbar.
- **Se anticipa**: con el modo de observación activado, Klai detecta solo los momentos importantes (un gol, un penal, una tarjeta) y los muestra por su cuenta.
- **Todo por voz**: también manejas la interfaz hablando. "Cierra el marcador", "mueve las estadísticas a la derecha", "limpia todo".
- **Manejable**: arrastras, cierras y acomodas cada widget a tu gusto.

## Más allá del deporte

El mismo motor funciona en cualquier video: en una clase puedes pedir la definición de un concepto, en un video de cocina los pasos de la receta, en gameplay información de lo que aparece en pantalla. Klai detecta el tipo de contenido y elige los widgets adecuados.

## Stack

Extensión de Chrome (Manifest V3, React, Vite) y backend en Next.js sobre Vercel. IA con Claude para visión y salida estructurada, transcripción de voz, y datos deportivos en vivo desde ESPN.

## Track

New Interface. Klai no es otro chatbot: es una interfaz que se construye a sí misma según lo que le pides.
