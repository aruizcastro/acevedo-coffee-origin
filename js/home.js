/* Home page: farm details, lot list, map and contact links */
(function () {
  'use strict';

  var C = window.Coffee;

  /* Acevedo town center (1°49′N 75°53′W), used until the farm coordinates are set */
  var ACEVEDO = [1.8167, -75.8833];

  C.initLang();
  C.initNav();
  C.initReveal();

  /* ---------- Farm details ---------- */

  C.loadJSON('data/farm.json').then(function (farm) {
    C.bindFarm(farm);
    renderContact(farm.contact || {});
    initMap(farm);
    if (!C.isPending(farm.brand)) {
      C.onLang(function (lang) {
        document.title = C.text(farm.brand, lang) + ' · ' +
          (lang === 'en' ? 'Coffee from Acevedo, Huila' : 'Café de Acevedo, Huila');
      });
    }
  }).catch(function (err) {
    console.error(err);
    initMap({});
  });

  /* ---------- Lot list ---------- */

  var list = document.getElementById('lot-list');

  C.loadJSON('data/lots.json').then(function (data) {
    var lots = (data && data.lots) || [];
    if (!lots.length) {
      list.innerHTML = '<p>' + C.bi('Pronto publicaremos los lotes de esta cosecha.',
        'Lots from this harvest will be published soon.') + '</p>';
      return;
    }
    list.innerHTML = lots.map(lotCard).join('');
    C.initReveal();
  }).catch(function (err) {
    console.error(err);
    list.innerHTML = '<p>' + C.bi(
      'No pudimos cargar la lista de lotes. Si abriste el archivo directamente desde tu computador, usa un servidor local (ver README).',
      'We could not load the lot list. If you opened the file straight from your computer, use a local server (see README).') + '</p>';
  });

  function lotCard(lot) {
    var notes = (lot.tasting_notes || []).map(function (n) {
      return '<li>' + C.loc(n) + '</li>';
    }).join('');
    return '' +
      '<a class="lot-card reveal" href="lot.html?id=' + encodeURIComponent(lot.id) + '">' +
        '<div class="lot-card-top">' +
          '<span class="lot-code">' + C.esc(lot.id) + '</span>' +
          (lot.example ? '<span class="tag-example">' + C.bi('Ejemplo', 'Example') + '</span>' : '') +
        '</div>' +
        '<h3>' + C.loc(lot.name) + '</h3>' +
        '<p class="lot-card-meta">' + C.loc(lot.variety) + ' · ' + C.loc(lot.process) + ' · ' +
          C.numBi(lot.altitude_masl, ' msnm', ' masl') + '</p>' +
        (notes ? '<ul class="notes">' + notes + '</ul>' : '') +
        '<div class="lot-card-foot">' +
          '<span class="lot-card-score">' + C.numBi(lot.sca_score) +
            '<small>' + C.bi('PUNTOS SCA', 'SCA POINTS') + '</small></span>' +
          '<span class="lot-card-go">' + C.bi('Ver ficha →', 'View sheet →') + '</span>' +
        '</div>' +
      '</a>';
  }

  /* Search box: normalises what the customer typed and opens the lot page */
  var search = document.getElementById('lot-search');
  if (search) {
    search.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = document.getElementById('lot-id').value.trim().toUpperCase();
      if (id) location.href = 'lot.html?id=' + encodeURIComponent(id);
    });
  }

  /* ---------- Contact ---------- */

  function renderContact(contact) {
    link('contact.whatsapp', contact.whatsapp, function (v) {
      return 'https://wa.me/' + v.replace(/\D/g, '');
    });
    link('contact.instagram', contact.instagram, function (v) {
      return 'https://www.instagram.com/' + encodeURIComponent(v.replace(/^@/, '')) + '/';
    });
    link('contact.email', contact.email, function (v) { return 'mailto:' + v; });

    /* One line per point of sale; entries that are URLs become links */
    var places = document.querySelector('[data-f="contact.where_to_buy"]');
    var items = contact.where_to_buy;
    if (places && Array.isArray(items) && items.length && !C.isPending(items)) {
      places.innerHTML = items.map(function (item) {
        var plain = C.text(item, 'es');
        return /^https?:\/\//.test(plain)
          ? '<a href="' + C.esc(plain) + '" target="_blank" rel="noopener">' + C.esc(plain.replace(/^https?:\/\//, '')) + '</a>'
          : C.loc(item);
      }).join('<br>');
    }
  }

  function link(path, value, toHref) {
    var el = document.querySelector('[data-f="' + path + '"]');
    if (!el || typeof value !== 'string' || C.isPending(value)) return;
    el.innerHTML = '<a href="' + C.esc(toHref(value.trim())) + '" target="_blank" rel="noopener">' + C.esc(value) + '</a>';
  }

  /* ---------- Map ---------- */

  function initMap(farm) {
    var box = document.getElementById('map');
    var note = document.getElementById('map-note');
    if (!box || !window.L) {
      if (note) note.innerHTML = C.bi('No se pudo cargar el mapa.', 'The map could not be loaded.');
      return;
    }

    var coords = (farm.farm && farm.farm.coordinates) || {};
    var hasFarm = typeof coords.lat === 'number' && typeof coords.lon === 'number';
    var center = hasFarm ? [coords.lat, coords.lon] : ACEVEDO;

    var map = L.map(box, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false })
      .setView(center, hasFarm ? 12 : 11);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    L.circleMarker(ACEVEDO, { radius: 6, color: '#21150d', weight: 2, fillColor: '#f6eedd', fillOpacity: 1 })
      .addTo(map)
      .bindPopup(C.bi('Casco urbano de Acevedo', 'Acevedo town center'));

    if (hasFarm) {
      /* A wide circle rather than a pin: the location is approximate on purpose */
      var area = L.circle(center, { radius: 1500, color: '#a02f27', weight: 2, fillColor: '#b8623a', fillOpacity: 0.3 })
        .addTo(map)
        .bindPopup('<strong>' + C.loc(farm.farm.name) + '</strong><br>' +
          C.bi('Ubicación aproximada', 'Approximate location'));
      map.fitBounds(L.latLngBounds([center, ACEVEDO]).pad(0.4), { maxZoom: 13 });
      area.openPopup();
      note.innerHTML = C.bi('Ubicación aproximada de la finca', 'Approximate farm location');
    } else {
      note.innerHTML = '<span class="pending">' + C.bi(
        '[PENDIENTE: coordenadas de la finca] — se muestra el casco urbano de Acevedo',
        '[PENDIENTE: farm coordinates] — showing Acevedo town center') + '</span>';
    }
  }
})();
