/* =========================================================================
 * art-notes.js — curated art-historical notes for the large artwork view.
 *
 * The catalogue in data.js / works-extra.js carries the facts the game
 * economy needs (painter, year, type, price). What a player wants when they
 * open a picture is the story: where the canvas hangs, what it is painted
 * with, why it mattered. That text lives here, keyed by work id.
 *
 * Every entry is a real, checkable fact about the original. Works without an
 * entry simply show the catalogue facts — an empty note never breaks the view.
 * ========================================================================= */
(function () {
  'use strict';

  var NOTES = {
    /* ---------------- Renaissance ---------------- */
    botticelli_dante_comedy: {
      museum: 'Kupferstichkabinett, Berlin (and other sheets)',
      medium: 'Silverpoint and pen on parchment',
      dimensions: 'approx. 32 x 47 cm per sheet',
      story: 'Botticelli drew nearly a hundred sheets for Lorenzo di Pierfrancesco de\' Medici\'s manuscript of Dante\'s "Divine Comedy". Each cantica opens with a large frontispiece before the small scenes begin.',
      note: 'The Dante drawings are the only large cycle Botticelli completed besides his mythologies. They were never finished as an illuminated codex, and the sheets were split up; today they are scattered across Berlin, the Vatican and London.'
    },
    leonardo_mona_lisa: {
      museum: 'Musée du Louvre, Paris',
      medium: 'Oil on poplar panel',
      dimensions: '77 x 53 cm',
      story: 'Painted around 1503 in Florence and carried by Leonardo to France in 1516, the portrait of Lisa Gherardini (wife of the silk merchant Francesco del Giocondo) entered the royal collection of Francis I.',
      note: 'The panel is poplar, not canvas, and is thinner than a centimetre. Its fame began in 1911 with the theft by Vincenzo Peruggia, which made the picture a household name overnight. The "sfumato" modelling has no visible brushwork boundaries.'
    },
    bosch_garden_of_delights: {
      museum: 'Museo del Prado, Madrid',
      medium: 'Oil on oak panels (triptych)',
      dimensions: '205.5 x 384.9 cm (open)',
      story: 'A triptych with the Garden of Earthly Delights at its centre, the creation of Eve on the left wing and Hell on the right — the single most discussed Netherlandish painting in existence.',
      note: 'The work is first documented in 1517, one year after Bosch died, so authorship has been argued for centuries. The wings close to reveal the earth as a grey grisaille globe: the world before life.'
    },
    vaneyck_arnolfini: {
      museum: 'National Gallery, London',
      medium: 'Oil on oak panel',
      dimensions: '82.2 x 60 cm',
      story: 'Usually read as the betrothal of the Bruges merchant Giovanni di Nicolao Arnolfini, dated 1434 by the inscription above the convex mirror.',
      note: 'The mirror reflects two figures entering the room, one of whom has been read as the painter himself — the earliest painted self-portrait in a mirror. Van Eyck\'s oil technique gives the brass chandelier and the sheepdog a realism Dutch painters only reached again a century later.'
    },
    bruegel_hunters: {
      museum: 'Kunsthistorisches Museum, Vienna',
      medium: 'Oil on oak panel',
      dimensions: '117 x 162 cm',
      story: 'Part of the series of the Months (six panels survived), this one represents January or February: hunters with dogs returning over a snowy ridge above a frozen village.',
      note: 'The series was painted for the Antwerp financier Niclaes Jonghelinck. The birds against the sky are often read as a compositional device — dark shapes that draw the eye across the white expanse.'
    },
    duerer_hare: {
      museum: 'Albertina, Vienna',
      medium: 'Watercolour and bodycolour on paper',
      dimensions: '25.1 x 22.6 cm',
      story: 'A watercolour study of a hare, signed and dated 1502 with Albrecht Dürer\'s monogram.',
      note: 'Dürer painted individual animals and plants as studies, not as finished works. The hare is built from thousands of fine brush strokes that render the fur as reflected light rather than as outline.'
    },

    /* ---------------- Baroque ---------------- */
    caravaggio_judith: {
      museum: 'Galleria Nazionale d\'Arte Antica (Palazzo Barberini), Rome',
      medium: 'Oil on canvas',
      dimensions: '145 x 195 cm',
      story: 'Judith beheads the Assyrian general Holofernes. Caused a sensation when it was shown in 1600 for its brutal realism and its use of a young woman\'s face that contemporaries connected with Beatrice Cenci.',
      note: 'Caravaggio lit the scene from a single hard source at the left, letting the rest fall into black — the "tenebroso" manner that reshaped European painting. The sword is held at arm\'s length, the way a person would who does not wish to be at the task.'
    },
    rubens_descent: {
      museum: 'Cathedral of Our Lady, Antwerp',
      medium: 'Oil on panel (centre panel)',
      dimensions: '421 x 311 cm (centre)',
      story: 'The central panel of the altarpiece for the Arquebusiers\' chapel in Antwerp, completed 1612-1614. Christ\'s body is lowered diagonally into an outpouring of flesh and cloth.',
      note: 'The triptych is still in the church it was painted for. Rubens framed the composition so that the diagonal of the body points to the side wings, pulling the viewer\'s eye across the whole altarpiece.'
    },
    rembrandt_nightwatch: {
      museum: 'Rijksmuseum, Amsterdam',
      medium: 'Oil on canvas',
      dimensions: '379.5 x 453.5 cm',
      story: 'The militia company of Captain Frans Banninck Cocq, painted 1642. The night-time title is a nineteenth-century mistake: the varnish had darkened, and a cleaning revealed a daylight scene.',
      note: 'A seventeenth-century document lists eighteen names for a painting of seventeen figures — which is why the composition keeps being re-read. The yellow lieutenant in the centre is a colour chord against the blacks around him.'
    },
    vermeer_pearl_earring: {
      museum: 'Mauritshuis, The Hague',
      medium: 'Oil on canvas',
      dimensions: '44.5 x 39 cm',
      story: 'A tronie — a character head rather than a portrait. In 2018 the Mauritshuis gave it its present name; for centuries it was simply "Girl with a Turban".',
      note: 'There is no earring body: Vermeer painted only two white highlights, letting the eye of the viewer build the pearl. The painting is by far the most reproduced Dutch picture of the world.'
    },
    velazquez_meninas: {
      museum: 'Museo del Prado, Madrid',
      medium: 'Oil on canvas',
      dimensions: '318 x 276 cm',
      story: 'Las Meninas shows the Infanta Margarita with her maids in a room of the Alcázar, the king and queen reflected in the mirror, and the painter himself at the easel.',
      note: 'Velázquez includes himself standing before the canvas we cannot see — the picture is about looking and being looked at. Luca Giordano called it "the theology of painting".'
    },
    claude_embarkation: {
      museum: 'National Gallery, London',
      medium: 'Oil on canvas',
      dimensions: '149.1 x 196.2 cm',
      story: 'The Queen of Sheba embarking for Jerusalem, painted 1648 for Cardinal Camillo Massimi. Signed on the ship\'s side: "CLAVDE GILLEE IVN. / ROMAE 1648".',
      note: 'Lorrain strove to make coastlines, ships and skies heavier or lighter according to the length of time the works would be on display; the embarkation is the most elaborate of his mythological harbours.'
    },

    /* ---------------- Romantic & Realist ---------------- */
    friedrich_wanderer: {
      museum: 'Hamburger Kunsthalle, Hamburg',
      medium: 'Oil on canvas',
      dimensions: '94.8 x 74.8 cm',
      story: 'A man in a dark coat stands on a rock above a sea of fog, painted around 1818.',
      note: 'The painting is a milestone of Rückenfigur — the figure seen from behind invites the viewer to look with him rather than at him. It entered the Hamburger Kunsthalle in 1970 and became the emblem of German Romanticism.'
    },
    goya_maja: {
      museum: 'Museo del Prado, Madrid',
      medium: 'Oil on canvas',
      dimensions: '97 x 190 cm',
      story: 'The Naked Maja, painted around 1797-1800, is among the first Western paintings of a nude female figure with visible pubic hair and no mythological disguise.',
      note: 'Goya was summoned before the Inquisition in 1815 over the two Majas. The companion clothed version was painted later, and the pair was seized from the collection of Manuel Godoy.'
    },
    turner_fighting_temeraire: {
      museum: 'National Gallery, London',
      medium: 'Oil on canvas',
      dimensions: '90.7 x 121.6 cm',
      story: 'A battleship of Trafalgar, now a hulk, is towed to the breaker\'s yard at Deptford, painted 1839.',
      note: 'Turner insisted the ship was towed by a small steamer — the old order of sail pulled away by the new means of propulsion. He wrote to the painter Clarkson Stanfield to insist on the tug\'s smoke.'
    },

    /* ---------------- Impressionism & Post ---------------- */
    pissarro_boulevard_montmartre: {
      museum: 'Private collection (and related versions in the Hermitage and elsewhere)',
      medium: 'Oil on canvas',
      dimensions: '53 x 65 cm',
      story: 'One of a series of the Boulevard Montmartre seen from Pissarro\'s window in the Grand Hôtel de Russie, painted in the winter and spring of 1897.',
      note: 'Pissarro painted the same view in several lights within weeks, a method he borrowed from Monet. He worked across the street from his hotel room, unable to walk far after an eye infection.'
    },
    seurat_grande_jatte: {
      museum: 'Art Institute of Chicago',
      medium: 'Oil on canvas',
      dimensions: '207.6 x 308.1 cm',
      story: 'Parisians on the island of La Grande Jatte on a Sunday afternoon, exhibited at the last Impressionist exhibition in 1886.',
      note: 'Painted with pointillism — thousands of dots of pure colour meant to blend in the viewer\'s eye. The work was almost invisible on the crowded exhibition wall, and only later became a founding work of Neo-Impressionism.'
    },
    munch_the_scream: {
      museum: 'National Museum, Oslo (and three other versions)',
      medium: 'Tempera on board',
      dimensions: '91 x 73.5 cm',
      story: 'Munch recorded the moment he felt "an infinite scream passing through nature" while walking on the Ekeberg hill in 1892.',
      note: 'There are four versions — two painted, two pastels — and a lithograph with a self-portrait on the stone. Pages of the sky are often read as the aftermath of the 1883 Krakatoa sunset.'
    },
    toulouse_moulin_rouge: {
      museum: 'Art Institute of Chicago',
      medium: 'Oil on canvas',
      dimensions: '123 x 141 cm',
      story: 'The dance floor of the Moulin Rouge in Montmartre, painted 1892-1895 with the can-can dancer La Goulue and a figure of the painter in the background.',
      note: 'Lautrec painted with turpentine-thinned oils on card and canvas, the paint scrubbed so dry that the strokes take the roughness of the surface — an experiment with the physical wear of the paint.'
    },
    chagall_i_and_the_village: {
      museum: 'Museum of Modern Art, New York',
      medium: 'Oil on canvas',
      dimensions: '192.1 x 151.4 cm',
      story: 'Painted in 1911 in Paris, looking back to the shtetl of Vitebsk, where Chagall grew up.',
      note: 'The goat faces the painter across a divided circle — the village memory on one side, the new city on the other. It entered MoMA in 1936 and is the best known of Chagall\'s early works.'
    },

    /* ---------------- Modernism ---------------- */
    matisse_the_dance: {
      museum: 'Hermitage, St Petersburg',
      medium: 'Oil on canvas',
      dimensions: '260 x 391 cm',
      story: 'Two versions of the same composition were painted in 1909-1910, for Shchukin\'s staircase in Moscow. This is the first; the other is in MoMA.',
      note: 'Matisse extracted the colour contrast between the red bodies, the blue ground and the green sky from earlier drawings. Five figures in a ring: a closed contour that has echoed through dance and design ever since.'
    },
    picasso_demoiselles: {
      museum: 'Museum of Modern Art, New York',
      medium: 'Oil on canvas',
      dimensions: '243.9 x 233.7 cm',
      story: 'Five women in a Barcelona brothel, painted 1907 and kept in the studio for years; bought by MoMA in 1939.',
      note: 'The two right-hand masks drawn from Iberian sculpture and African objects represent a break with classical perspective from which Cubism developed. The picture was seen as unfinished by many of Picasso\'s friends when he showed it.'
    },
    kandinsky_improvisation_26: {
      museum: 'Städtische Galerie im Lenbachhaus, Munich',
      medium: 'Oil on canvas',
      dimensions: '107.5 x 158 cm',
      story: 'Painted in 1912, one of a series of "Improvisations" that Kandinsky made before his first fully abstract works in 1913.',
      note: 'The picture is named after its musical form: Kandinsky treated colour and line the way a composer treats sound — a claim he set out in "Concerning the Spiritual in Art" the same year.'
    },
    marc_blue_horse: {
      museum: 'Städtische Galerie im Lenbachhaus, Munich',
      medium: 'Oil on canvas',
      dimensions: '112 x 85.5 cm',
      story: 'A blue horse seen from behind, painted 1911, and the founding image of the "Blue Rider" (Blauer Reiter) group.',
      note: 'Marc assigned specific colours to states of being: blue for the spiritual and masculine. The horse has no rider in most of the series — an animal without human control, a signature of the group.'
    },
    schiele_death_and_maiden: {
      museum: 'Národní galerie, Prague',
      medium: 'Oil on canvas',
      dimensions: '150 x 180 cm',
      story: 'Schiele painted it in 1915 in Vienna while the First World War was being fought around him; he was called up that year.',
      note: 'A woman and a man embrace over a sheet marked with rust and grey tones that read as both a grave and a blanket. Schiele died three years later at 28, in the influenza pandemic.'
    },
    leger_nudes_in_the_forest: {
      museum: 'Kröller-Müller Museum, Otterlo',
      medium: 'Oil on canvas',
      dimensions: '120.5 x 170.5 cm',
      story: 'Bodies assembled from cylinders, cones and tubes against a forest, painted 1909-1910. The first work in which Léger reached his mature style — "tubism", as critics called it.',
      note: 'The painting was called "the battle of the nudes in the forest" because the forms look like metal and machine parts rather than flesh, an early signal of the mechanical aesthetic Léger carried through his career.'
    },
    munch_the_kiss: {
      museum: 'Munch Museum, Oslo',
      medium: 'Oil on canvas',
      dimensions: '81 x 99 cm',
      story: 'Two figures locked in a kiss, their faces merged into a single form.',
      note: 'Nothing separates the two faces in the painted surface — the pair literally become one colour field, one of the most direct expressions of Munch\'s idea of love as dissolution of the self.'
    }
  };

  /* A short note for every painter in the catalogue, so the large view can
     always name the school and the years. */
  var ARTIST_NOTES = {
    botticelli: 'Florentine, in the circle of the Medici: mythologies and altarpieces.',
    leonardo: 'Florentine, the model Renaissance "uomo universale" — painter, anatomist, engineer.',
    bosch: 'Hertogenbosch, a moralist whose imagery is unique in Netherlandish painting.',
    vaneyck: 'Bruges, inventor-painter of the oil technique in the Netherlands.',
    bruegel: 'Antwerp and Brussels; the great picture-chronicler of Flemish peasant life.',
    duerer: 'Nuremberg; painter and the age\'s great printmaker.',
    caravaggio: 'Milan and Rome; the extreme chiaroscuro from which Baroque Europe took its cue.',
    rubens: 'Antwerp; head of a workshop that painted the altarpieces of Catholic Europe.',
    rembrandt: 'Leiden and Amsterdam; the Dutch Golden Age\'s portrait-lighting master.',
    vermeer: 'Delft; only around 35 attributions survive.',
    velazquez: 'Seville and Madrid; court painter to Philip IV.',
    lorrain: 'Lorraine-born, worked in Rome: the classical ideal landscape.',
    friedrich: 'Dresden; the painter of fog, ruins and back-turned figures.',
    goya: 'Zaragoza and Madrid; court painter and witness of the Napoleonic wars.',
    turner: 'London; landscape as light, and vice versa.',
    pissarro: 'Danish-French Impressionist, the only painter in every Impressionist exhibition.',
    seurat: 'Paris; the pointillist system, cut short at 31.',
    munch: 'Oslo; the Norwegian father of Expressionism.',
    toulouse_lautrec: 'Albi and Paris; Montmartre\'s nightlife in poster-ink colours.',
    chagall: 'Vitebsk and Paris; dream logic and the shtetl.',
    matisse: 'Paris and Nice; colour as structure, the leader of the Fauves.',
    picasso: 'Málaga, Barcelona, Paris; the co-inventor of Cubism.',
    kandinsky: 'Munich and Moscow; the first fully abstract paintings.',
    marc: 'Munich; animal forms and colour symbolism in the Blue Rider group.',
    schiele: 'Vienna; the most exposed line in Austrian modernism.',
    leger: 'Paris; the human figure rebuilt from tubes and cylinders.'
  };

  window.ART_RACE_NOTES = { works: NOTES, artists: ARTIST_NOTES };
})();
