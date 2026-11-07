with open('app-artview.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_plate = """    var plate = pic
      ? '<figure class="av-plate"><img src="' + h(pic.file) + '" alt="' + h(w.title) + '" loading="eager" decoding="async">' +
        (pic.how === 'alias' ? '<figcaption>A stand-in plate: a different original by the same painter.</figcaption>' : '') +
        '</figure>'
      : '<div class="av-plate av-plate--missing"><span>No picture imported for this work yet</span></div>';"""

new_plate = """    var german = window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de';
    var plaqueArtist = artist ? artist.name.toUpperCase() : 'UNKNOWN';
    var plaqueYears = (artist && artist.birthYear && artist.deathYear) ? ' (' + artist.birthYear + '–' + artist.deathYear + ')' : '';
    var plaqueTitle = w.title + (w.yearCreated ? ' · ' + w.yearCreated : '');

    var plaqueHtml = '<div class="art-museum-plaque">' +
      '<span class="plaque-artist">' + h(plaqueArtist + plaqueYears) + '</span>' +
      '<span class="plaque-title">' + h(plaqueTitle) + '</span>' +
    '</div>';

    var plate = pic
      ? '<figure class="av-plate art-museum-frame">' +
          '<div class="art-frame-moulding">' +
            '<div class="art-frame-mat">' +
              '<div class="art-frame-canvas">' +
                '<img src="' + h(pic.file) + '" alt="' + h(w.title) + '" loading="eager" decoding="async">' +
              '</div>' +
            '</div>' +
          '</div>' +
          plaqueHtml +
          (pic.how === 'alias' ? '<figcaption>' + (german ? 'Stellvertreter-Werk desselben Künstlers' : 'A stand-in plate: a different original by the same painter.') + '</figcaption>' : '') +
        '</figure>'
      : '<div class="av-plate av-plate--missing"><span>' + (german ? 'Noch kein Bild importiert' : 'No picture imported for this work yet') + '</span></div>';"""

text_norm = text.replace('\r\n', '\n')
old_norm = old_plate.replace('\r\n', '\n')
assert old_norm in text_norm, 'old_plate not found'

text_replaced = text_norm.replace(old_norm, new_plate.replace('\r\n', '\n'))
if '\r\n' in text:
    text_replaced = text_replaced.replace('\n', '\r\n')

with open('app-artview.js', 'w', encoding='utf-8') as f:
    f.write(text_replaced)

print('Updated app-artview.js successfully.')
