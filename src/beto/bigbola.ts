// Conocimiento del sitio bigbola.mx para BETO: bono de bienvenida, promociones,
// pagos, apuestas deportivas, casino y juego responsable.
//
// Fuente: páginas públicas de bigbola.mx consultadas en octubre de 2026
// (/promo/bono-de-bienvenida, /promociones, /apuestas-deportivas, /faqs,
// /depositos-y-retiros, /casino, /juego-responsable, /politica-de-privacidad).
// Las promociones cambian: BETO siempre manda a revisar vigencia y T&C en el sitio.

export const SITE = 'https://www.bigbola.mx';
export const REVISADO = 'octubre 2026';

export const BONO_BIENVENIDA = {
  titulo: 'Bono de bienvenida',
  oferta: '300% hasta $30,000 MXN + 100 giros gratis',
  url: SITE + '/promo/bono-de-bienvenida/',
  condiciones: [
    'Primer depósito de $100 MXN o más, en un solo pago.',
    'Solo cuentas nuevas registradas desde el 23 de febrero de 2026.',
    'Rollover de 15 veces el bono. Ej.: depositas $100, recibes $300 de bono y debes apostar $4,500.',
    'Tienes 10 días después de activarlo para cumplir el rollover.',
    'Cada apuesta o giro cuenta máximo $2,000 MXN para el rollover.',
    'En deportes, momio mínimo de 1.67 para que cuente.',
    'Ruleta, craps, baccarat, blackjack y video póker no cuentan para el rollover.',
    'Cashout y momios mejorados no cuentan para el rollover.',
    '100 giros gratis en Chests of Cai Shen 2, de $0.04 c/u; ganancia máxima $10,000 MXN.',
    'Si depositas por SPEI, pide a soporte que valide la promoción.',
    'Si retiras antes de cumplir el rollover puedes perder el bono y sus ganancias.',
  ],
};

export const PROMOS = [
  { titulo: 'Aumento de ganancias en parlays', detalle: 'Hasta 100% más de ganancia en parlays de 2 o más selecciones.', url: SITE + '/promociones/' },
  { titulo: 'Safe Parlay Premier League', detalle: 'Apuesta mínima $200, momios de 2.00 o más. Promoción por temporada: revisa vigencia.', url: SITE + '/promociones/' },
  { titulo: 'Pago anticipado', detalle: 'Te pagan antes del final si tu equipo saca ventaja (ej. 2 goles en fútbol, 18 puntos en básquetbol).', url: SITE + '/apuestas-deportivas/' },
];

export const PAGOS = {
  url: SITE + '/depositos-y-retiros/',
  depositos: [
    { metodo: 'OXXO Pay', detalle: 'Mín. $100 · máx. $10,000 por transacción · hasta 3 por hora · la tienda cobra $15' },
    { metodo: 'SPEI', detalle: 'Mín. $50 · para el bono de bienvenida pide validación a soporte' },
    { metodo: 'Tarjeta Visa / Mastercard', detalle: 'Puede pedir verificación 3D Secure de tu banco' },
    { metodo: 'Todito Cash, Neteller, Skrill', detalle: 'Monederos y prepago disponibles' },
  ],
  retiro: 'Retiro mínimo $100 MXN. Antes de cobrar te pueden pedir identificación y comprobar tu método de pago.',
};

export const DEPORTES = {
  url: SITE + '/apuestas-deportivas/',
  resumen: 'Momios en formato decimal y americano. Apuestas prepartido, en vivo y parlays. En vivo, los mercados se suspenden en goles o jugadas clave y el momio puede cambiar al validar. Hay pago anticipado. Fútbol nacional e internacional (Liga MX, Premier League), béisbol (MLB), básquetbol y fútbol americano.',
};

export const RESPONSABLE = {
  url: SITE + '/juego-responsable/',
  texto: 'Solo mayores de 18. Fija presupuesto y tiempo, toma descansos, no juegues con dinero de gastos básicos ni prestado. Autoexclusión: escribe a soporte@bigbola.mx con tu identificación oficial.',
  permiso: 'Opera con permiso de SEGOB DGG/723/97 (oficio DGJS/2062/2023).',
};

/** Resumen para la IA de BETO. */
export const KNOWLEDGE = [
  `Conocimiento de bigbola.mx (revisado ${REVISADO}; las promos cambian, manda siempre a confirmar vigencia y T&C en el sitio):`,
  `- ${BONO_BIENVENIDA.titulo}: ${BONO_BIENVENIDA.oferta}. ${BONO_BIENVENIDA.condiciones.join(' ')}`,
  `- Promociones: ${PROMOS.map(p => p.titulo + ': ' + p.detalle).join(' | ')}`,
  `- Depósitos: ${PAGOS.depositos.map(d => d.metodo + ' (' + d.detalle + ')').join('; ')}. ${PAGOS.retiro}`,
  `- Deportes: ${DEPORTES.resumen}`,
  `- Casino: slots (Gates of Olympus, Sweet Bonanza, Chests of Cai Shen 2, Megaways), casino en vivo (Crazy Time, Immersive Roulette, blackjack, baccarat), bingo y versiones demo gratis.`,
  `- Juego responsable: ${RESPONSABLE.texto} ${RESPONSABLE.permiso}`,
].join('\n');
