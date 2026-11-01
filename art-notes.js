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
    pissarro_red_roofs: {
      museum: 'Musee d\'Orsay, Paris',
      story: 'Painted in 1877, this winter view near Pontoise places red roofs among bare branches. Pissarro builds the landscape from interlocking patches of colour rather than a single dominant subject.',
      note: 'The full title is The Red Roofs, Corner of a Village, Winter.',
      source: 'https://www.musee-orsay.fr/en'
    },
    pissarro_hoarfrost: {
      museum: 'Musee d\'Orsay, Paris',
      story: 'A figure carrying a bundle crosses a frost-covered field. The 1873 painting uses slanting shadows and muted earth colours to suggest the cold light of a winter morning.',
      note: 'The French title is Gelee blanche. It was shown at the first Impressionist exhibition in 1874.',
      source: 'https://www.musee-orsay.fr/en'
    },
    caravaggio_bacchus: {
      museum: 'Uffizi Gallery, Florence',
      story: 'A young Bacchus offers a cup of wine across a table of fruit. Painted around 1595-1597, the image brings a classical god into the immediate world of an ordinary model.',
      note: 'The fruit and wine combine sensory pleasure with signs of ripeness and decay.',
      source: 'https://www.uffizi.it/en/artworks/bacchus'
    },
    caravaggio_calling_of_saint_matthew: {
      museum: 'Contarelli Chapel, San Luigi dei Francesi, Rome',
      story: 'Christ enters a room of men counting money. His pointing hand and a strong diagonal beam of light turn a familiar interior into a moment of revelation.',
      note: 'Painted in 1599-1600, the work remains in the chapel for which it was commissioned.',
      source: 'https://www.sanluigideifrancesi.org/'
    },
    friedrich_monk_by_the_sea: {
      museum: 'Alte Nationalgalerie, Berlin',
      story: 'A solitary monk stands before a vast sea and sky. Friedrich strips away the usual landscape landmarks, making the contrast between the small figure and open space the subject.',
      note: 'Painted in 1808-1810 and exhibited with The Abbey in the Oakwood.',
      source: 'https://www.smb.museum/en/museums-institutions/alte-nationalgalerie/home/'
    },
    friedrich_chalk_cliffs: {
      museum: 'Kunst Museum Winterthur, Reinhart am Stadtgarten',
      story: 'Three figures look through white cliffs towards the sea. The composition combines close, precarious ground with a distant horizon and is associated with Friedrich\'s 1818 journey to Rugen.',
      note: 'The landscape is a composed vision rather than a literal view from one identifiable cliff.',
      source: 'https://www.kmw.ch/'
    },
    lorrain_marriage_of_isaac_and_rebekah: {
      museum: 'National Gallery, London',
      story: 'Dancers and musicians gather beside a river in a broad pastoral landscape. Claude uses trees, buildings and warm distance to give the biblical celebration an ideal setting.',
      note: 'Painted in 1648, also known as The Mill. Its companion is The Embarkation of the Queen of Sheba.',
      source: 'https://www.nationalgallery.org.uk/paintings/claude-landscape-with-the-marriage-of-isaac-and-rebekah'
    },
    lorrain_seaport_at_sunset: {
      museum: 'Louvre Museum, Paris',
      story: 'Ships and classical architecture frame the low sun in an imagined harbour. The scene turns the activities of a port into an exploration of luminous distance.',
      note: 'Catalogue reference: the Louvre seaport of 1639. Claude painted several related harbour compositions.',
      source: 'https://collections.louvre.fr/en/'
    },
    munch_sick_child: {
      museum: 'National Museum, Oslo',
      story: 'A pale child rests against a pillow beside a grieving woman. Munch repeatedly scraped and reworked the surface, making the image feel like a memory that cannot settle.',
      note: 'Catalogue reference: the original 1885-1886 painting. Munch later returned to the subject in paintings and prints.',
      source: 'https://www.nasjonalmuseet.no/en/collection/object/NG.M.00839'
    },
    munch_madonna: {
      museum: 'National Museum, Oslo',
      story: 'A woman with closed eyes emerges from flowing dark forms beneath a red halo. Munch joins devotional associations with a deliberately unconventional, sensual figure.',
      note: 'Catalogue reference: the National Museum painting dated 1894. Other painted versions and lithographs have different dimensions.',
      source: 'https://www.nasjonalmuseet.no/en/collection/object/NG.M.00841'
    },
    schiele_self_portrait_physalis: {
      museum: 'Leopold Museum, Vienna',
      story: 'Schiele turns an angular face towards the viewer beside the bright pods of a Chinese lantern plant. The small 1912 panel gives his gaze an unusually concentrated presence.',
      note: 'Also called Self-Portrait with Physalis. The plant provides a vivid counterpoint to the dark clothing.',
      source: 'https://www.leopoldmuseum.org/en/collection'
    },
    schiele_seated_woman: {
      museum: 'National Gallery Prague',
      story: 'A seated woman raises one knee beneath her tilted head. Angular outlines and patches of colour make the informal pose into an intense study of body and expression.',
      note: 'A 1917 work on paper, not an oil painting. The English title is also given as Seated Woman with Bent Knee.',
      source: 'https://www.ngprague.cz/en'
    },
    leger_mechanic: {
      museum: 'National Gallery of Canada, Ottawa',
      story: 'The worker\'s rounded limbs and firm outlines echo the machinery of the modern world. Leger gives an everyday figure the solidity and scale of a monument.',
      note: 'Catalogue reference: the 1920 painting in Ottawa. The French title is Le Mecanicien.',
      source: 'https://www.gallery.ca/collection/artwork/the-mechanic'
    },
    leger_city: {
      museum: 'Philadelphia Museum of Art',
      story: 'Signs, stairs, figures and coloured planes overlap in a compressed urban panorama. Leger makes the modern city a structure of movement rather than a view from one fixed position.',
      note: 'Painted in 1919; French title: La Ville.',
      source: 'https://www.philamuseum.org/'
    },
    marc_yellow_cow: {
      museum: 'Solomon R. Guggenheim Museum, New York',
      story: 'A yellow cow leaps across a landscape of bright, angular colour. Marc uses the animal and its surroundings to suggest a joyful world beyond naturalistic appearances.',
      note: 'Painted in 1911. Colour carries symbolic and emotional meaning in Marc\'s work.',
      source: 'https://www.guggenheim.org/artwork/2760'
    },
    marc_fate_of_the_animals: {
      museum: 'Kunstmuseum Basel',
      story: 'Animals are caught among slashing lines and fractured trees. The 1913 painting turns a forest into a scene of violent disruption.',
      note: 'Part of the painting was damaged by fire in 1916. Paul Klee restored the damaged area using restrained brown tones.',
      source: 'https://kunstmuseumbasel.ch/en/collection'
    },
    seurat_bathers_at_asnieres: {
      museum: 'National Gallery, London',
      story: 'Men and boys rest beside the Seine against a distant industrial skyline. Seurat gives this suburban scene a monumental stillness and carefully balanced arrangement.',
      note: 'Completed in 1884, before the fully developed pointillism of A Sunday on La Grande Jatte.',
      source: 'https://www.nationalgallery.org.uk/paintings/georges-seurat-bathers-at-asnieres'
    },
    seurat_circus: {
      museum: 'Musee d\'Orsay, Paris',
      story: 'A performer balances on a running horse while spectators form ordered rows around the ring. Curving lines and luminous colour turn the circus into a system of rhythms.',
      note: 'Seurat\'s last major painting, begun in 1890 and left unfinished at his death in 1891.',
      source: 'https://www.musee-orsay.fr/en'
    },
    toulouse_dance_at_moulin_rouge: {
      museum: 'Philadelphia Museum of Art',
      story: 'Dancers practise on the floor of the Moulin Rouge while fashionable spectators watch. Lautrec combines the performance with a sharp observation of the surrounding crowd.',
      note: 'The 1890 dance scene is distinct from At the Moulin Rouge, the later group around a table already in this catalogue.',
      source: 'https://www.philamuseum.org/'
    },
    toulouse_jane_avril: {
      museum: 'Impressions in several museum collections, including the Musee Toulouse-Lautrec, Albi',
      story: 'The dancer Jane Avril becomes a sweeping silhouette in this 1893 lithographic poster. Lautrec uses a bold outline and an unusual cropped foreground to make an instantly recognisable advertisement.',
      note: 'Catalogue reference: the 1893 poster. Multiple impressions survive; sheet dimensions vary with trimming and state.',
      source: 'https://www.musee-toulouse-lautrec.com/'
    },
    matisse_red_studio: {
      museum: 'Museum of Modern Art, New York',
      story: 'Matisse floods his studio with a field of red, leaving furniture and objects picked out by slender outlines. The paintings within the painting retain their own contrasting colours.',
      note: 'Painted in 1911; French title: L\'Atelier rouge.',
      source: 'https://www.moma.org/collection/works/78389'
    },
    matisse_woman_with_a_hat: {
      museum: 'San Francisco Museum of Modern Art',
      story: 'Matisse paints his wife Amelie with patches of green, orange, pink and blue. Colour shapes the face and clothing without following their expected local appearance.',
      note: 'Shown at the 1905 Salon d\'Automne, where the radical colour of Matisse and his peers helped give rise to the name Fauves.',
      source: 'https://www.sfmoma.org/artwork/91.161/'
    },
    leonardo_lady_with_an_ermine: {
      museum: 'Princes Czartoryski Museum, Krakow',
      story: 'Cecilia Gallerani turns while holding an ermine whose movement echoes her own. Leonardo links face, hands and animal in a closely observed court portrait.',
      note: 'Usually dated around 1489-1491. The sitter was associated with the court of Ludovico Sforza in Milan.',
      source: 'https://mnk.pl/en/branch/the-princes-czartoryski-museum'
    },
    leonardo_virgin_of_the_rocks: {
      museum: 'Louvre Museum, Paris',
      story: 'Mary, the two infants and an angel form a unified group in a shadowy rocky landscape. Gestures and soft transitions of light connect the figures without a rigid architectural setting.',
      note: 'Catalogue reference: the Louvre version, begun in 1483 and transferred from panel to canvas. Often dated 1483-1486; the Louvre gives a broader range of circa 1483-1494. The London version is a separate painting.',
      source: 'https://collections.louvre.fr/en/ark:/53355/cl010062373'
    },
    chagall_birthday: {
      museum: 'Museum of Modern Art, New York',
      story: 'A man bends impossibly through the air to kiss a woman carrying flowers. Chagall transforms a domestic room into a space governed by affection rather than gravity.',
      note: 'Painted in 1915, the year Chagall married Bella Rosenfeld. The support is cardboard.',
      source: 'https://www.moma.org/collection/'
    },
    chagall_paris_through_the_window: {
      museum: 'Solomon R. Guggenheim Museum, New York',
      story: 'The Eiffel Tower, a cat, a parachutist and a two-faced figure share a colourful view of Paris. The window connects observed city life with memory and fantasy.',
      note: 'Painted in 1913 during Chagall\'s first period in Paris.',
      source: 'https://www.guggenheim.org/artwork/793'
    },
    picasso_old_guitarist: {
      museum: 'Art Institute of Chicago',
      story: 'An elderly musician bends over a guitar in a nearly monochrome blue setting. The warm instrument provides the strongest colour contrast to his elongated body.',
      note: 'Painted in late 1903-early 1904 during Picasso\'s Blue Period, on a wooden panel.',
      source: 'https://www.artic.edu/artworks/28067/the-old-guitarist'
    },
    picasso_three_musicians: {
      museum: 'Museum of Modern Art, New York',
      story: 'Three theatrical musicians are assembled from interlocking, flat coloured shapes. The apparently cut-paper construction is painted in oil.',
      note: 'Catalogue reference: the MoMA version of 1921. Picasso also painted a separate version now in Philadelphia.',
      source: 'https://www.moma.org/collection/works/78630'
    },
    kandinsky_yellow_red_blue: {
      museum: 'Centre Pompidou, Paris',
      story: 'Large fields of yellow, red and blue interact with arcs, grids and floating geometric forms. Kandinsky builds movement from colour and shape rather than recognisable objects.',
      note: 'Painted in 1925 during his Bauhaus years; German title: Gelb-Rot-Blau.',
      source: 'https://www.centrepompidou.fr/en/'
    },
    kandinsky_composition_vii: {
      museum: 'Tretyakov Gallery, Moscow',
      story: 'A dense current of colour, curves and diagonals fills the canvas. Preparatory studies connect the abstraction with themes of flood, resurrection and renewal.',
      note: 'The large oil painting was completed in 1913. It is distinct from its many preparatory drawings and watercolours.',
      source: 'https://www.tretyakovgallery.ru/en/'
    },
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
    },

    /* ---------------- Seville, Delft and the Rococo ---------------- */
    velazquez_cooking_eggs: {
      museum: 'Scottish National Gallery, Edinburgh',
      medium: 'Oil on canvas',
      dimensions: '100.5 x 119.5 cm',
      story: 'Painted in Seville around 1618, before Velázquez moved to Madrid for good in 1623: an old woman fries or poaches eggs while a boy holds a melon and a flask. The scene is a kitchen, not a history.',
      note: 'Velázquez built the picture from the people around him — the old woman reappears in his "Christ in the House of Martha and Mary" of the same year. Whether she is frying or poaching has been argued for centuries, which is why the title shifts between "Frying" and "Cooking Eggs". The copper pot, the eggs and the clay jug are painted with a still-life care that Spanish collectors of the period prized above narrative.'
    },
    velazquez_man_in_black: {
      museum: 'Museo del Prado, Madrid (attributed)',
      medium: 'Oil on canvas',
      dimensions: 'approx. 115 x 85 cm',
      story: 'A half-length portrait of a gentleman in a black doublet and white collar, dated to Velázquez\'s Madrid years around 1640, at the height of his work as court painter to Philip IV.',
      note: 'Velázquez painted black as no one before him: the costume is built from a dozen near-blacks that separate satin, wool and shadow, so that the whole body reads without a single contour line. The face is lit from one side and left almost unmodelled, which is what gives his court portraits their stillness. Many pictures of this type were once labelled "Portrait of a Man" because the sitter\'s name had been lost.'
    },
    vermeer_love_letter: {
      museum: 'Rijksmuseum, Amsterdam',
      medium: 'Oil on canvas',
      dimensions: '44 x 38.5 cm',
      story: 'A maid hands a letter to her seated mistress, who has just been playing a cittern. In the foreground hangs a heavy tied-back curtain, as if the viewer had stepped into a private room.',
      note: 'The curtain is painted trompe-l\'oeil — Dutch collectors really did hang little curtains over their pictures to keep the light off, and Vermeer painted the curtain into the scene itself. The cittern in the woman\'s lap identifies the letter as a love letter without a word of text. The diagonal of the checkered floor pulls the eye back to the figures, and the door in the background lets a second light into the room.'
    },
    vermeer_music_lesson_study: {
      museum: 'Royal Collection, Picture Gallery, Buckingham Palace, London (original)',
      medium: 'Oil on canvas (original); drawn copy in this catalogue',
      dimensions: '74.6 x 64.1 cm (original)',
      story: 'A young woman seated at a virginal while a man stands behind her, his mouth slightly open as though he were singing or counting the beat. Painted around 1662-1665.',
      note: 'Music was the standard Dutch metaphor for harmony between lovers, and the man\'s half-open mouth is usually read as a courtship gesture. Vermeer repeats his signature objects here — the draped rug over the table, the black-and-white tiled floor, the window with its light falling from the left. The painting stayed in his household until his death in 1675, when his family had to sell it; after passing through the collection of the Venetian painter Pellegrini it entered the English Royal Collection.'
    },
    watteau_cythera_reduction: {
      museum: 'Louvre, Paris (original of 1717); Schloss Charlottenburg, Berlin (second version)',
      medium: 'Oil on canvas',
      dimensions: '129 x 194 cm (Louvre original)',
      story: 'Couples in silk and satin drift down a slope towards a gilded boat that will carry them to Cythera, the island of Venus. Watteau submitted the picture to the Académie in 1717 as his reception piece.',
      note: 'The Académie had no category for a picture like this, so they invented one for him: "fête galante". The title says pilgrimage, but the figures seem to be leaving the island, not arriving — the ambiguity has been read as a quiet melancholy beneath the celebration. A later, more elaborate version of about 1718-1719 hangs at Charlottenburg in Berlin; an earlier, simpler treatment of c. 1709-1710 is in Frankfurt. Watteau died at 36, seven years after painting the Louvre picture.'
    },
    watteau_fete_champetre: {
      museum: 'Musée du Louvre, Paris (a related version is in the Hermitage, St Petersburg)',
      medium: 'Oil on canvas',
      dimensions: 'approx. 125 x 188 cm',
      story: 'A country party beneath tall trees: musicians, a dog, and groups of elegantly dressed figures in conversation, painted around 1718-1721.',
      note: 'The "fête champêtre" is the older, pastoral form of Watteau\'s "fête galante" — the same open-air sociability, but in the country rather than on a mythic island. Watteau painted no finished outline first: the surface is built from light, thin touches laid side by side, which is why his landscapes seem to dissolve at the edges. The figures often look as if they have just stopped speaking.'
    },
    watteau_harlequin_study: {
      museum: 'Musée du Louvre, Paris (related sheets in the British Museum)',
      medium: 'Red chalk on paper',
      dimensions: 'approx. 20 x 16 cm',
      story: 'A figure study of Harlequin, the masked servant of the Italian commedia dell\'arte, drawn around 1716 — the years in which Watteau made the theatre his main subject.',
      note: 'Watteau drew constantly from life and kept the sheets in bound volumes; the "Recueil Julienne" of about 500 drawings became the most famous of these albums. Harlequin and Pierrot figure in his paintings again and again, but he never painted them as clowns: their faces are painted from behind or in profile, which lets the costume carry the emotion. Red sanguine chalk is the medium of most of his surviving studies.'
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
    watteau: 'Valenciennes and Paris; invented the "fête galante" for the Académie in 1717, dead at 36.',
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
