/* Lot page: lot.html?id=ACV-2026-001 reads data/lots.json and renders that lot */
(function () {
  'use strict';

  var C = window.Coffee;
  var box = document.getElementById('lot');
  var requested = (new URLSearchParams(location.search).get('id') || '').trim();

  C.initLang();

  Promise.all([
    C.loadJSON('data/lots.json'),
    C.loadJSON('data/farm.json').catch(function () { return {}; })
  ]).then(function (results) {
    var lots = (results[0] && results[0].lots) || [];
    var farm = results[1];
    var lot = lots.filter(function (l) {
      return String(l.id).toUpperCase() === requested.toUpperCase();
    })[0];

    box.innerHTML = lot ? lotSheet(lot) : lotMissing(lots);
    C.bindFarm(farm);
    if (lot) {
      drawQR(lot);
      hideBrokenPhotos();
    }
    C.onLang(function (lang) {
      var brand = C.isPending(farm.brand) ? (lang === 'en' ? 'Coffee from Acevedo' : 'Café de Acevedo') : C.text(farm.brand, lang);
      document.title = lot
        ? lot.id + ' · ' + C.text(lot.name, lang) + ' · ' + brand
        : (lang === 'en' ? 'Lot not found' : 'Lote no encontrado') + ' · ' + brand;
    });
  }).catch(function (err) {
    console.error(err);
    box.innerHTML = '<div class="lot-sheet lot-missing">' +
      '<h1>' + C.bi('No pudimos cargar los datos', 'We could not load the data') + '</h1>' +
      '<p>' + C.bi('Revisa tu conexión e inténtalo de nuevo en un momento.',
        'Check your connection and try again in a moment.') + '</p>' +
      '</div>';
  });

  /* ---------- Lot found ---------- */

  function lotSheet(lot) {
    var drying = lot.drying || {};
    var notes = (lot.tasting_notes || []).map(function (n) { return '<li>' + C.loc(n) + '</li>'; }).join('');
    var photos = lot.photos || [];

    return '' +
      '<article class="lot-sheet">' +
        (lot.example ? '<p class="example-banner mono">' + C.bi(
          'Ejemplo — lote ficticio con datos inventados',
          'Example — fictional lot with made-up data') + '</p>' : '') +

        '<header class="lot-head">' +
          '<p class="lot-code">' + C.bi('Lote', 'Lot') + ' ' + C.esc(lot.id) + '</p>' +
          '<h1>' + C.loc(lot.name) + '</h1>' +
          '<p class="lot-origin"><span data-f="farm.name"></span> · Acevedo, Huila</p>' +
          '<div class="lot-head-foot">' +
            (notes ? '<div><p class="mono label">' + C.bi('Notas de cata', 'Tasting notes') + '</p>' +
              '<ul class="notes">' + notes + '</ul></div>' : '') +
            '<p class="score"><strong>' + C.numBi(lot.sca_score) + '</strong>' +
              '<span>' + C.bi('Puntos SCA', 'SCA points') + '</span></p>' +
          '</div>' +
        '</header>' +

        (photos[0] ? '<figure class="lot-photo"><img src="' + C.esc(photos[0]) + '" alt="" width="1600" height="900"></figure>' : '') +

        '<div class="lot-body">' +
          '<section>' +
            '<h2>' + C.bi('El recorrido de este lote', 'This lot’s journey') + '</h2>' +
            '<ol class="journey">' +
              step(C.bi('Cosecha', 'Harvest'), C.dateBi(lot.harvest_date),
                C.loc(lot.variety) + ' · ' + C.numBi(lot.altitude_masl, ' msnm', ' masl')) +
              step(C.bi('Fermentación', 'Fermentation'), daysBi(lot.fermentation_days),
                C.bi('Proceso', 'Process') + ' ' + lower(lot.process)) +
              step(C.bi('Secado', 'Drying'), daysBi(drying.days), C.loc(drying.method)) +
              step(C.bi('Tueste', 'Roast'), C.dateBi(lot.roast_date), C.loc(lot.roast_level)) +
            '</ol>' +
          '</section>' +

          '<section>' +
            '<h2>' + C.bi('Ficha técnica', 'Technical sheet') + '</h2>' +
            '<dl class="specs">' +
              spec(C.bi('Variedad', 'Variety'), C.loc(lot.variety)) +
              spec(C.bi('Proceso', 'Process'), C.loc(lot.process)) +
              spec(C.bi('Altitud', 'Altitude'), C.numBi(lot.altitude_masl, ' msnm', ' masl')) +
              spec(C.bi('Fecha de cosecha', 'Harvest date'), C.dateBi(lot.harvest_date)) +
              spec(C.bi('Fermentación', 'Fermentation'), daysBi(lot.fermentation_days)) +
              spec(C.bi('Secado', 'Drying'), C.loc(drying.method) + ' · ' + daysBi(drying.days)) +
              spec(C.bi('Puntaje SCA', 'SCA score'), C.numBi(lot.sca_score)) +
              spec(C.bi('Fecha de tueste', 'Roast date'), C.dateBi(lot.roast_date)) +
              spec(C.bi('Nivel de tueste', 'Roast level'), C.loc(lot.roast_level)) +
              spec(C.bi('Peso del empaque', 'Bag weight'), C.numBi(lot.weight_g, ' g')) +
            '</dl>' +
          '</section>' +

          (photos.length > 1 ? '<section><h2>' + C.bi('Fotos del lote', 'Lot photos') + '</h2>' +
            '<div class="gallery">' + photos.slice(1).map(function (src) {
              return '<img src="' + C.esc(src) + '" alt="" loading="lazy" width="600" height="600">';
            }).join('') + '</div></section>' : '') +

          '<section>' +
            '<h2>' + C.bi('De dónde viene', 'Where it comes from') + '</h2>' +
            '<div class="origin-box">' +
              '<dl>' +
                '<div><dt>' + C.bi('Finca', 'Farm') + '</dt><dd data-f="farm.name"></dd></div>' +
                '<div><dt>' + C.bi('Vereda', 'Vereda') + '</dt><dd data-f="farm.vereda"></dd></div>' +
                '<div><dt>' + C.bi('Productor(es)', 'Producer(s)') + '</dt><dd data-f="producers.names"></dd></div>' +
              '</dl>' +
              '<a class="btn btn-dark" href="index.html#region">' +
                C.bi('Conoce la región y la finca', 'Meet the region and the farm') + '</a>' +
            '</div>' +
          '</section>' +

          '<section>' +
            '<h2>' + C.bi('Comparte este lote', 'Share this lot') + '</h2>' +
            '<div class="qr-box">' +
              '<div class="qr-code" id="qr"></div>' +
              '<div>' +
                '<p>' + C.bi('Este código QR lleva directamente a esta ficha.',
                  'This QR code leads straight to this sheet.') + '</p>' +
                '<p class="qr-url" id="qr-url"></p>' +
              '</div>' +
            '</div>' +
          '</section>' +
        '</div>' +
      '</article>';
  }

  function step(label, main, detail) {
    return '<li><span class="mono">' + label + '</span><strong>' + main + '</strong><small>' + detail + '</small></li>';
  }

  function spec(label, value) {
    return '<div><dt>' + label + '</dt><dd>' + value + '</dd></div>';
  }

  function daysBi(n) {
    if (typeof n !== 'number') return C.loc(n);
    return C.bi(C.formatNumber(n, 'es') + (n === 1 ? ' día' : ' días'),
      C.formatNumber(n, 'en') + (n === 1 ? ' day' : ' days'));
  }

  function lower(value) {
    return C.bi(C.text(value, 'es').toLowerCase(), C.text(value, 'en').toLowerCase());
  }

  /* QR for the public address of this lot (works on GitHub Pages and locally) */
  function drawQR(lot) {
    var target = document.getElementById('qr');
    var url = location.origin + location.pathname + '?id=' + encodeURIComponent(lot.id);
    document.getElementById('qr-url').textContent = url;
    if (!target || typeof window.qrcode !== 'function') {
      if (target) target.remove();
      return;
    }
    var qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    target.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    var svg = target.querySelector('svg');
    if (svg) {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'QR ' + lot.id);
    }
  }

  /* A missing photo should leave no gap or broken-image icon */
  function hideBrokenPhotos() {
    box.querySelectorAll('img').forEach(function (img) {
      function hide() {
        var holder = img.closest('.lot-photo') || img;
        holder.remove();
      }
      if (img.complete && img.naturalWidth === 0) hide();
      else img.addEventListener('error', hide);
    });
  }

  /* ---------- Lot not found ---------- */

  function lotMissing(lots) {
    var title = requested
      ? C.bi('No encontramos ese lote', 'We couldn’t find that lot')
      : C.bi('¿Cuál es tu lote?', 'Which lot is yours?');
    var message = requested
      ? '<p>' + C.bi('El código', 'The code') + ' <span class="asked">' + C.esc(requested) + '</span> ' +
        C.bi('no está en nuestro registro. Revisa que esté escrito igual que en tu empaque, o elige uno de los lotes publicados:',
          'is not in our records. Check that it matches the one on your bag, or pick one of the published lots:') + '</p>'
      : '<p>' + C.bi('Elige el código impreso en tu empaque:', 'Pick the code printed on your bag:') + '</p>';

    var items = lots.map(function (l) {
      return '<li><a href="lot.html?id=' + encodeURIComponent(l.id) + '">' +
        '<span class="lot-code">' + C.esc(l.id) + '</span><span>' + C.loc(l.name) + '</span></a></li>';
    }).join('');

    return '<div class="lot-sheet lot-missing">' +
      '<h1>' + title + '</h1>' + message +
      (items ? '<ul>' + items + '</ul>' : '') +
      '<a class="btn btn-dark" href="index.html">' + C.bi('Ir al inicio', 'Go to the home page') + '</a>' +
      '</div>';
  }
})();
