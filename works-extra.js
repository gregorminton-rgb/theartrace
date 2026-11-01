/* =========================================================================
 * works-extra.js — additional painters and their complete three-work sets.
 *
 * data.js carries twenty painters with three works each. This file adds
 * fifteen painters with three works each: 35 painters and 105 works in total.
 * Keep exactly three distinct works per painter for the collection logic.
 * Every work participates in dealer stock, auction lots and the price band.
 *
 * Every record carries the catalogue facts the game shows next to a picture:
 * year (yearCreated), painter (artistId -> artists[].name) and kind of picture
 * (type / typeName). `medium` and `dimensions` are the two web-only extras the
 * trade rows print under the credit line.
 *
 * This file MUST load after data.js and before engine.js — engine.js merges
 * the lists into ART_DATA before it builds artistById / workById and measures
 * the price spread, so an entry declared here is indistinguishable from an
 * exported one everywhere else in the game. The merge is idempotent.
 * ========================================================================= */
(function (global) {
  'use strict';

  /* ART_RACE_* records below are kept as plain literals (no constants, no
     expressions) on purpose: tools/import-artwork-images.ps1 parses them out
     of this file to know which painters and works exist. */

  global.ART_RACE_EXTRA_ARTISTS = [
    {
      id: 'pissarro', name: 'Camille Pissarro', epoch: 4, epochName: 'Impressionism',
      bio: 'The elder of the group: the only painter who showed in all eight Impressionist exhibitions, and the one the younger dealers trust.',
      birthYear: 1830, deathYear: 1903, nationality: 'French',
      baseReputation: 79, reputationMultiplier: 1.79, annualAppreciation: 0.045,
      catalogueSize: 974, forgeryProne: false, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'friedrich', name: 'Caspar David Friedrich', epoch: 3, epochName: 'Romanticism',
      bio: 'Rückenfigur landscapes: a solitary figure, a mist, a promise of something beyond the frame. Berlin collectors pay for the mood.',
      birthYear: 1774, deathYear: 1840, nationality: 'German',
      baseReputation: 81, reputationMultiplier: 1.81, annualAppreciation: 0.046,
      catalogueSize: 988, forgeryProne: false, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'lorrain', name: 'Claude Lorrain', epoch: 1, epochName: 'Baroque',
      bio: 'The harbour at sunrise, gilded to the horizon. Half the seascapes in circulation answer to his name, many of them falsely.',
      birthYear: 1600, deathYear: 1682, nationality: 'French',
      baseReputation: 83, reputationMultiplier: 1.83, annualAppreciation: 0.047,
      catalogueSize: 1004, forgeryProne: true, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'munch', name: 'Edvard Munch', epoch: 5, epochName: 'Modern',
      bio: 'The scream heard across a fjord. Berlin loved him, Dresden loved him, and both markets still do.',
      birthYear: 1863, deathYear: 1944, nationality: 'Norwegian',
      baseReputation: 90, reputationMultiplier: 1.90, annualAppreciation: 0.049,
      catalogueSize: 1070, forgeryProne: true, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'schiele', name: 'Egon Schiele', epoch: 6, epochName: 'Contemporary',
      bio: 'Wien, 1915: line, skin and grief. Few pictures exist and every serious collection wants one.',
      birthYear: 1890, deathYear: 1918, nationality: 'Austrian',
      baseReputation: 87, reputationMultiplier: 1.87, annualAppreciation: 0.048,
      catalogueSize: 1041, forgeryProne: true, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'leger', name: 'Fernand Leger', epoch: 6, epochName: 'Contemporary',
      bio: 'Tubes, cylinders and men turned into machinery. The painters of the machine age quote him constantly.',
      birthYear: 1881, deathYear: 1955, nationality: 'French',
      baseReputation: 77, reputationMultiplier: 1.77, annualAppreciation: 0.045,
      catalogueSize: 953, forgeryProne: false, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'marc', name: 'Franz Marc', epoch: 6, epochName: 'Contemporary',
      bio: 'A blue horse as an answer to the world. The Blaue Reiter circle, cut short in 1916.',
      birthYear: 1880, deathYear: 1916, nationality: 'German',
      baseReputation: 84, reputationMultiplier: 1.84, annualAppreciation: 0.047,
      catalogueSize: 1016, forgeryProne: false, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'seurat', name: 'Georges Seurat', epoch: 4, epochName: 'Impressionism',
      bio: 'Points of paint on a meadow. Thirty-one years old and the most copied pointilliste there is.',
      birthYear: 1859, deathYear: 1891, nationality: 'French',
      baseReputation: 89, reputationMultiplier: 1.89, annualAppreciation: 0.049,
      catalogueSize: 1061, forgeryProne: true, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'matisse', name: 'Henri Matisse', epoch: 6, epochName: 'Contemporary',
      bio: 'Sheet after sheet of cut paper. Nice keeps a room ready for anything new of his.',
      birthYear: 1869, deathYear: 1954, nationality: 'French',
      baseReputation: 92, reputationMultiplier: 1.92, annualAppreciation: 0.050,
      catalogueSize: 1088, forgeryProne: true, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'toulouse_lautrec', name: 'Henri de Toulouse-Lautrec', epoch: 4, epochName: 'Impressionism',
      bio: 'Montmartre at two in the morning, on stone and on canvas. The posters are everywhere; the lithograph stones are not.',
      birthYear: 1864, deathYear: 1901, nationality: 'French',
      baseReputation: 82, reputationMultiplier: 1.82, annualAppreciation: 0.046,
      catalogueSize: 997, forgeryProne: false, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'leonardo', name: 'Leonardo da Vinci', epoch: 0, epochName: 'Renaissance',
      bio: 'Fewer than twenty pictures survive. Every one of them is an argument, and every argument has a forgery attached.',
      birthYear: 1452, deathYear: 1519, nationality: 'Italian',
      baseReputation: 98, reputationMultiplier: 1.98, annualAppreciation: 0.051,
      catalogueSize: 1140, forgeryProne: true, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'chagall', name: 'Marc Chagall', epoch: 6, epochName: 'Contemporary',
      bio: 'Vitebsk floating above the roofs: fiddlers, cows and lovers upside down. Paris buys him by the crate.',
      birthYear: 1887, deathYear: 1985, nationality: 'Russian',
      baseReputation: 85, reputationMultiplier: 1.85, annualAppreciation: 0.048,
      catalogueSize: 1027, forgeryProne: true, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'caravaggio', name: 'Caravaggio', epoch: 1, epochName: 'Baroque',
      bio: 'A candle, a blade, a refusal to flatter. Roma has been fighting over his altarpieces for three centuries.',
      birthYear: 1571, deathYear: 1610, nationality: 'Italian',
      baseReputation: 94, reputationMultiplier: 1.94, annualAppreciation: 0.050,
      catalogueSize: 1103, forgeryProne: true, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'picasso', name: 'Pablo Picasso', epoch: 6, epochName: 'Contemporary',
      bio: 'The most forged painter alive. The market is deep, the experts are busy, and the better fakes come with a story.',
      birthYear: 1881, deathYear: 1973, nationality: 'Spanish',
      baseReputation: 96, reputationMultiplier: 1.96, annualAppreciation: 0.051,
      catalogueSize: 1122, forgeryProne: true, homeRegion: 0, homeRegionName: 'Europe'
    },
    {
      id: 'kandinsky', name: 'Wassily Kandinsky', epoch: 6, epochName: 'Contemporary',
      bio: 'Muenchen, then Weimar: colour freed from the object. The first abstract pictures are the ones collectors ask for.',
      birthYear: 1866, deathYear: 1944, nationality: 'Russian',
      baseReputation: 88, reputationMultiplier: 1.88, annualAppreciation: 0.048,
      catalogueSize: 1052, forgeryProne: true, homeRegion: 0, homeRegionName: 'Europe'
    }
  ];

  global.ART_RACE_EXTRA_WORKS = [
    {
      id: 'pissarro_red_roofs', title: 'The Red Roofs',
      description: 'The Red Roofs, 1877 - Camille Pissarro.',
      artistId: 'pissarro', yearCreated: 1877, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '54.5 x 65.5 cm',
      basePrice: 30000, rarity: 6, rarityMultiplier: 2.0, isMasterpiece: false,
      hasKnownForgery: false, typicalCondition: 0.78, homeCityId: 'paris'
    },
    {
      id: 'pissarro_hoarfrost', title: 'Hoarfrost',
      description: 'Hoarfrost, 1873 - Camille Pissarro.',
      artistId: 'pissarro', yearCreated: 1873, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '65.5 x 93.2 cm',
      basePrice: 28000, rarity: 6, rarityMultiplier: 2.0, isMasterpiece: false,
      hasKnownForgery: false, typicalCondition: 0.76, homeCityId: 'paris'
    },
    {
      id: 'caravaggio_bacchus', title: 'Bacchus',
      description: 'Bacchus, circa 1595-1597 - Caravaggio.',
      artistId: 'caravaggio', yearCreated: 1596, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '95 x 85 cm',
      basePrice: 78000, rarity: 9, rarityMultiplier: 2.8, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.56, homeCityId: 'roma'
    },
    {
      id: 'caravaggio_calling_of_saint_matthew', title: 'The Calling of Saint Matthew',
      description: 'The Calling of Saint Matthew, 1599-1600 - Caravaggio.',
      artistId: 'caravaggio', yearCreated: 1600, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '322 x 340 cm',
      basePrice: 96000, rarity: 10, rarityMultiplier: 3.0, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.54, homeCityId: 'roma'
    },
    {
      id: 'friedrich_monk_by_the_sea', title: 'The Monk by the Sea',
      description: 'The Monk by the Sea, 1808-1810 - Caspar David Friedrich.',
      artistId: 'friedrich', yearCreated: 1810, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '110 x 171.5 cm',
      basePrice: 48000, rarity: 8, rarityMultiplier: 2.4, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.64, homeCityId: 'berlin'
    },
    {
      id: 'friedrich_chalk_cliffs', title: 'Chalk Cliffs on Rugen',
      description: 'Chalk Cliffs on Rugen, circa 1818 - Caspar David Friedrich.',
      artistId: 'friedrich', yearCreated: 1818, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '90.5 x 71 cm',
      basePrice: 46000, rarity: 8, rarityMultiplier: 2.4, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.66, homeCityId: 'berlin'
    },
    {
      id: 'lorrain_marriage_of_isaac_and_rebekah', title: 'Landscape with the Marriage of Isaac and Rebekah',
      description: 'Landscape with the Marriage of Isaac and Rebekah, 1648 - Claude Lorrain.',
      artistId: 'lorrain', yearCreated: 1648, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '149.1 x 196.9 cm',
      basePrice: 42000, rarity: 7, rarityMultiplier: 2.2, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.55, homeCityId: 'paris'
    },
    {
      id: 'lorrain_seaport_at_sunset', title: 'Seaport at Sunset',
      description: 'Seaport at Sunset, 1639 - Claude Lorrain.',
      artistId: 'lorrain', yearCreated: 1639, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '137 x 103 cm',
      basePrice: 38000, rarity: 7, rarityMultiplier: 2.2, isMasterpiece: false,
      hasKnownForgery: true, typicalCondition: 0.54, homeCityId: 'paris'
    },
    {
      id: 'munch_sick_child', title: 'The Sick Child',
      description: 'The Sick Child, 1885-1886 - Edvard Munch.',
      artistId: 'munch', yearCreated: 1886, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '119.5 x 118.5 cm',
      basePrice: 74000, rarity: 9, rarityMultiplier: 2.8, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.60, homeCityId: 'berlin'
    },
    {
      id: 'munch_madonna', title: 'Madonna',
      description: 'Madonna, circa 1894 - Edvard Munch.',
      artistId: 'munch', yearCreated: 1894, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '90.5 x 70.5 cm',
      basePrice: 78000, rarity: 9, rarityMultiplier: 2.8, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.62, homeCityId: 'berlin'
    },
    {
      id: 'schiele_self_portrait_physalis', title: 'Self-Portrait with Chinese Lantern Plant',
      description: 'Self-Portrait with Chinese Lantern Plant, 1912 - Egon Schiele.',
      artistId: 'schiele', yearCreated: 1912, type: 0, typeName: 'Painting',
      medium: 'Oil and opaque colour on wood', dimensions: '32.2 x 39.8 cm',
      basePrice: 70000, rarity: 8, rarityMultiplier: 2.6, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.70, homeCityId: 'wien'
    },
    {
      id: 'schiele_seated_woman', title: 'Seated Woman with Bent Knees',
      description: 'Seated Woman with Bent Knees, 1917 - Egon Schiele.',
      artistId: 'schiele', yearCreated: 1917, type: 2, typeName: 'Drawing',
      medium: 'Gouache, watercolour and black crayon on paper', dimensions: '46 x 30.5 cm',
      basePrice: 58000, rarity: 8, rarityMultiplier: 2.5, isMasterpiece: false,
      hasKnownForgery: true, typicalCondition: 0.66, homeCityId: 'wien'
    },
    {
      id: 'leger_mechanic', title: 'The Mechanic',
      description: 'The Mechanic, 1920 - Fernand Leger.',
      artistId: 'leger', yearCreated: 1920, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '116 x 88.8 cm',
      basePrice: 56000, rarity: 8, rarityMultiplier: 2.5, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.72, homeCityId: 'paris'
    },
    {
      id: 'leger_city', title: 'The City',
      description: 'The City, 1919 - Fernand Leger.',
      artistId: 'leger', yearCreated: 1919, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '231.1 x 298.4 cm',
      basePrice: 66000, rarity: 8, rarityMultiplier: 2.5, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.70, homeCityId: 'paris'
    },
    {
      id: 'marc_yellow_cow', title: 'Yellow Cow',
      description: 'Yellow Cow, 1911 - Franz Marc.',
      artistId: 'marc', yearCreated: 1911, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '140.5 x 189.2 cm',
      basePrice: 68000, rarity: 8, rarityMultiplier: 2.6, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.70, homeCityId: 'muenchen'
    },
    {
      id: 'marc_fate_of_the_animals', title: 'Fate of the Animals',
      description: 'Fate of the Animals, 1913 - Franz Marc.',
      artistId: 'marc', yearCreated: 1913, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '195 x 263.5 cm',
      basePrice: 72000, rarity: 9, rarityMultiplier: 2.8, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.58, homeCityId: 'muenchen'
    },
    {
      id: 'seurat_bathers_at_asnieres', title: 'Bathers at Asnieres',
      description: 'Bathers at Asnieres, 1884 - Georges Seurat.',
      artistId: 'seurat', yearCreated: 1884, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '201 x 300 cm',
      basePrice: 102000, rarity: 9, rarityMultiplier: 3.0, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.66, homeCityId: 'paris'
    },
    {
      id: 'seurat_circus', title: 'The Circus',
      description: 'The Circus, 1890-1891 - Georges Seurat.',
      artistId: 'seurat', yearCreated: 1891, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '185.5 x 152.5 cm',
      basePrice: 92000, rarity: 9, rarityMultiplier: 2.8, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.64, homeCityId: 'paris'
    },
    {
      id: 'toulouse_dance_at_moulin_rouge', title: 'At the Moulin Rouge: The Dance',
      description: 'At the Moulin Rouge: The Dance, 1890 - Henri de Toulouse-Lautrec.',
      artistId: 'toulouse_lautrec', yearCreated: 1890, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '115.6 x 149.9 cm',
      basePrice: 42000, rarity: 7, rarityMultiplier: 2.3, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.68, homeCityId: 'paris'
    },
    {
      id: 'toulouse_jane_avril', title: 'Jane Avril',
      description: 'Jane Avril, 1893 - Henri de Toulouse-Lautrec.',
      artistId: 'toulouse_lautrec', yearCreated: 1893, type: 3, typeName: 'Print',
      medium: 'Colour lithograph poster on paper', dimensions: 'approx. 130 x 95 cm; varies by impression',
      basePrice: 28000, rarity: 6, rarityMultiplier: 2.0, isMasterpiece: false,
      hasKnownForgery: false, typicalCondition: 0.62, homeCityId: 'paris'
    },
    {
      id: 'matisse_red_studio', title: 'The Red Studio',
      description: 'The Red Studio, 1911 - Henri Matisse.',
      artistId: 'matisse', yearCreated: 1911, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '181 x 219.1 cm',
      basePrice: 108000, rarity: 9, rarityMultiplier: 3.0, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.74, homeCityId: 'paris'
    },
    {
      id: 'matisse_woman_with_a_hat', title: 'Woman with a Hat',
      description: 'Woman with a Hat, 1905 - Henri Matisse.',
      artistId: 'matisse', yearCreated: 1905, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '80.7 x 59.7 cm',
      basePrice: 92000, rarity: 9, rarityMultiplier: 2.8, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.72, homeCityId: 'paris'
    },
    {
      id: 'leonardo_lady_with_an_ermine', title: 'Lady with an Ermine',
      description: 'Lady with an Ermine, circa 1489-1491 - Leonardo da Vinci.',
      artistId: 'leonardo', yearCreated: 1490, type: 0, typeName: 'Painting',
      medium: 'Oil on walnut panel', dimensions: '54.8 x 40.3 cm',
      basePrice: 132000, rarity: 10, rarityMultiplier: 3.2, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.70, homeCityId: 'firenze'
    },
    {
      id: 'leonardo_virgin_of_the_rocks', title: 'Virgin of the Rocks',
      description: 'Virgin of the Rocks, 1483-1486, Louvre version - Leonardo da Vinci.',
      artistId: 'leonardo', yearCreated: 1486, type: 0, typeName: 'Painting',
      medium: 'Oil on panel, transferred to canvas', dimensions: '199.5 x 122 cm',
      basePrice: 140000, rarity: 10, rarityMultiplier: 3.3, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.66, homeCityId: 'firenze'
    },
    {
      id: 'chagall_birthday', title: 'The Birthday',
      description: 'The Birthday, 1915 - Marc Chagall.',
      artistId: 'chagall', yearCreated: 1915, type: 0, typeName: 'Painting',
      medium: 'Oil on cardboard', dimensions: '80.5 x 99.5 cm',
      basePrice: 62000, rarity: 8, rarityMultiplier: 2.5, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.72, homeCityId: 'paris'
    },
    {
      id: 'chagall_paris_through_the_window', title: 'Paris through the Window',
      description: 'Paris through the Window, 1913 - Marc Chagall.',
      artistId: 'chagall', yearCreated: 1913, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '136 x 141.9 cm',
      basePrice: 64000, rarity: 8, rarityMultiplier: 2.5, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.70, homeCityId: 'paris'
    },
    {
      id: 'picasso_old_guitarist', title: 'The Old Guitarist',
      description: 'The Old Guitarist, late 1903-early 1904 - Pablo Picasso.',
      artistId: 'picasso', yearCreated: 1904, type: 0, typeName: 'Painting',
      medium: 'Oil on panel', dimensions: '122.9 x 82.6 cm',
      basePrice: 118000, rarity: 9, rarityMultiplier: 3.0, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.70, homeCityId: 'paris'
    },
    {
      id: 'picasso_three_musicians', title: 'Three Musicians',
      description: 'Three Musicians, 1921, MoMA version - Pablo Picasso.',
      artistId: 'picasso', yearCreated: 1921, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '200.7 x 222.9 cm',
      basePrice: 126000, rarity: 10, rarityMultiplier: 3.2, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.76, homeCityId: 'paris'
    },
    {
      id: 'kandinsky_yellow_red_blue', title: 'Yellow-Red-Blue',
      description: 'Yellow-Red-Blue, 1925 - Wassily Kandinsky.',
      artistId: 'kandinsky', yearCreated: 1925, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '128 x 201.5 cm',
      basePrice: 62000, rarity: 8, rarityMultiplier: 2.5, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.76, homeCityId: 'muenchen'
    },
    {
      id: 'kandinsky_composition_vii', title: 'Composition VII',
      description: 'Composition VII, 1913 - Wassily Kandinsky.',
      artistId: 'kandinsky', yearCreated: 1913, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '200 x 300 cm',
      basePrice: 68000, rarity: 9, rarityMultiplier: 2.7, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.70, homeCityId: 'muenchen'
    },
    {
      id: 'pissarro_boulevard_montmartre', title: 'Boulevard Montmartre at night',
      description: 'Boulevard Montmartre at night, 1897 - Camille Pissarro.',
      artistId: 'pissarro', yearCreated: 1897, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '53 x 65 cm',
      basePrice: 34000, rarity: 6, rarityMultiplier: 2.0, isMasterpiece: false,
      hasKnownForgery: false, typicalCondition: 0.8, homeCityId: 'paris'
    },
    {
      id: 'friedrich_wanderer', title: 'Wanderer above the Sea of Fog',
      description: 'Wanderer above the Sea of Fog, 1818 - Caspar David Friedrich.',
      artistId: 'friedrich', yearCreated: 1818, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '94 x 75 cm',
      basePrice: 52000, rarity: 8, rarityMultiplier: 2.4, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.62, homeCityId: 'berlin'
    },
    {
      id: 'lorrain_queen_of_sheba', title: 'The Embarkation of the Queen of Sheba',
      description: 'The Embarkation of the Queen of Sheba, 1648 - Claude Lorrain.',
      artistId: 'lorrain', yearCreated: 1648, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '149 x 197 cm',
      basePrice: 44000, rarity: 7, rarityMultiplier: 2.2, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.55, homeCityId: 'paris'
    },
    {
      id: 'munch_the_scream', title: 'The Scream',
      description: 'The Scream, 1893 - Edvard Munch.',
      artistId: 'munch', yearCreated: 1893, type: 0, typeName: 'Painting',
      medium: 'Tempera and oil on board', dimensions: '91 x 74 cm',
      basePrice: 96000, rarity: 10, rarityMultiplier: 3.2, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.58, homeCityId: 'berlin'
    },
    {
      id: 'schiele_death_and_maiden', title: 'Death and the Maiden',
      description: 'Death and the Maiden, 1915 - Egon Schiele.',
      artistId: 'schiele', yearCreated: 1915, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '150 x 180 cm',
      basePrice: 88000, rarity: 9, rarityMultiplier: 2.9, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.68, homeCityId: 'wien'
    },
    {
      id: 'leger_nudes_in_the_forest', title: 'Nudes in the Forest',
      description: 'Nudes in the Forest, 1910 - Fernand Leger.',
      artistId: 'leger', yearCreated: 1910, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '120 x 170 cm',
      basePrice: 63000, rarity: 8, rarityMultiplier: 2.5, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.64, homeCityId: 'paris'
    },
    {
      id: 'marc_blue_horse', title: 'The Blue Horse I',
      description: 'The Blue Horse I, 1911 - Franz Marc.',
      artistId: 'marc', yearCreated: 1911, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '112 x 84 cm',
      basePrice: 76000, rarity: 9, rarityMultiplier: 2.8, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.7, homeCityId: 'muenchen'
    },
    {
      id: 'seurat_grande_jatte', title: 'A Sunday on La Grande Jatte',
      description: 'A Sunday afternoon on the island of La Grande Jatte, 1884 - Georges Seurat.',
      artistId: 'seurat', yearCreated: 1884, type: 0, typeName: 'Painting',
      medium: 'Pointillist oil on canvas', dimensions: '207 x 308 cm',
      basePrice: 120000, rarity: 10, rarityMultiplier: 3.2, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.6, homeCityId: 'paris'
    },
    {
      id: 'matisse_the_dance', title: 'The Dance',
      description: 'The Dance, 1910 - Henri Matisse.',
      artistId: 'matisse', yearCreated: 1910, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '260 x 391 cm',
      basePrice: 118000, rarity: 10, rarityMultiplier: 3.2, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.72, homeCityId: 'paris'
    },
    {
      id: 'toulouse_moulin_rouge', title: 'At the Moulin Rouge',
      description: 'At the Moulin Rouge, 1892 - Henri de Toulouse-Lautrec.',
      artistId: 'toulouse_lautrec', yearCreated: 1892, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '123 x 141 cm',
      basePrice: 46000, rarity: 7, rarityMultiplier: 2.3, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.66, homeCityId: 'paris'
    },
    {
      id: 'leonardo_mona_lisa', title: 'Mona Lisa',
      description: 'Mona Lisa, 1503 - Leonardo da Vinci.',
      artistId: 'leonardo', yearCreated: 1503, type: 0, typeName: 'Painting',
      medium: 'Oil on poplar panel', dimensions: '77 x 53 cm',
      basePrice: 160000, rarity: 10, rarityMultiplier: 3.4, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.74, homeCityId: 'firenze'
    },
    {
      id: 'chagall_i_and_the_village', title: 'I and the Village',
      description: 'I and the Village, 1911 - Marc Chagall.',
      artistId: 'chagall', yearCreated: 1911, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '192 x 151 cm',
      basePrice: 70000, rarity: 9, rarityMultiplier: 2.7, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.7, homeCityId: 'paris'
    },
    {
      id: 'caravaggio_judith', title: 'Judith Beheading Holofernes',
      description: 'Judith Beheading Holofernes, 1599 - Caravaggio.',
      artistId: 'caravaggio', yearCreated: 1599, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '145 x 195 cm',
      basePrice: 92000, rarity: 10, rarityMultiplier: 3.0, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.52, homeCityId: 'roma'
    },
    {
      id: 'picasso_demoiselles', title: 'Les Demoiselles d\'Avignon',
      description: 'Les Demoiselles d\'Avignon, 1907 - Pablo Picasso.',
      artistId: 'picasso', yearCreated: 1907, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '244 x 234 cm',
      basePrice: 140000, rarity: 10, rarityMultiplier: 3.4, isMasterpiece: true,
      hasKnownForgery: true, typicalCondition: 0.76, homeCityId: 'paris'
    },
    {
      id: 'kandinsky_improvisation_26', title: 'Improvisation 26',
      description: 'Improvisation 26, 1912 - Wassily Kandinsky.',
      artistId: 'kandinsky', yearCreated: 1912, type: 0, typeName: 'Painting',
      medium: 'Oil on canvas', dimensions: '107 x 158 cm',
      basePrice: 58000, rarity: 8, rarityMultiplier: 2.4, isMasterpiece: true,
      hasKnownForgery: false, typicalCondition: 0.74, homeCityId: 'muenchen'
    }
  ];

  /* Catalogue facts for the twenty exported painters' works, and the two
     web-only extras (medium, dimensions) for every exported work. Keyed by
     work id; engine.js merges them onto the work records before anything
     reads a price, so the trade rows can print them like the extra ones. */
  global.ART_RACE_WORK_CATALOGUE = {
    botticelli_dante_comedy:        { medium: 'Pen and ink on parchment', dimensions: '32 x 47 cm' },
    botticelli_primavera_detail:    { medium: 'Tempera on panel', dimensions: 'detail panel, 60 x 40 cm' },
    botticelli_venus_study:         { medium: 'Tempera on panel', dimensions: '172 x 278 cm' },
    cezanne_apples_oranges:         { medium: 'Oil on canvas', dimensions: '74 x 93 cm' },
    cezanne_card_players:           { medium: 'Oil on canvas', dimensions: '47 x 57 cm' },
    cezanne_sainte_victoire:        { medium: 'Oil on canvas', dimensions: '65 x 81 cm' },
    degas_at_the_races:             { medium: 'Pastel and charcoal on paper', dimensions: '30 x 40 cm' },
    degas_little_dancer:            { medium: 'Bronze, brown patina', dimensions: '98 cm high' },
    degas_the_star:                 { medium: 'Pastel on paper', dimensions: '60 x 44 cm' },
    durer_melencolia:               { medium: 'Engraving on laid paper', dimensions: '24 x 19 cm' },
    durer_praying_hands:            { medium: 'Pen and ink with wash', dimensions: '29 x 20 cm' },
    durer_young_hare_after:         { medium: 'Watercolour and bodycolour', dimensions: '25 x 23 cm' },
    fragonard_gentleman_portrait:   { medium: 'Oil on canvas', dimensions: '65 x 54 cm' },
    fragonard_the_swing_engraved:   { medium: 'Etching and engraving', dimensions: '53 x 42 cm' },
    fragonard_young_girl_reading:   { medium: 'Oil on canvas', dimensions: '48 x 39 cm' },
    gauguin_breton_sketch:          { medium: 'Pencil and crayon on paper', dimensions: '25 x 32 cm' },
    gauguin_tahitian_beach:         { medium: 'Oil on canvas', dimensions: '95 x 130 cm' },
    gauguin_yellow_christ:          { medium: 'Oil on canvas', dimensions: '92 x 73 cm' },
    goya_maja_study:                { medium: 'Red chalk on paper', dimensions: '20 x 15 cm' },
    goya_the_colossus:              { medium: 'Oil on canvas', dimensions: '116 x 105 cm' },
    goya_sleep_of_reason:           { medium: 'Etching and aquatint', dimensions: '22 x 15 cm' },
    hokusai_great_wave:             { medium: 'Woodblock print, nishiki-e', dimensions: '26 x 38 cm' },
    hokusai_red_fuji:               { medium: 'Woodblock print, nishiki-e', dimensions: '25 x 38 cm' },
    hokusai_sketchbook:             { medium: 'Ink on paper', dimensions: '22 x 34 cm' },
    klimt_adele_study:              { medium: 'Pencil and black chalk', dimensions: '45 x 30 cm' },
    klimt_the_kiss_study:           { medium: 'Pencil and gouache on paper', dimensions: '55 x 55 cm' },
    klimt_tree_of_life:             { medium: 'Chalk and stencil on paper', dimensions: '43 x 32 cm' },
    manet_folies_bergere:           { medium: 'Oil on canvas', dimensions: '72 x 92 cm' },
    manet_olympia_study:            { medium: 'Ink and watercolour', dimensions: '28 x 35 cm' },
    manet_peonies:                  { medium: 'Oil on canvas', dimensions: '55 x 46 cm' },
    monet_haystack:                 { medium: 'Oil on canvas', dimensions: '65 x 92 cm' },
    monet_impression_variant:       { medium: 'Oil on canvas', dimensions: '48 x 63 cm' },
    monet_water_lilies:             { medium: 'Oil on canvas', dimensions: '89 x 92 cm' },
    mucha_gismonda:                 { medium: 'Colour lithograph', dimensions: '107 x 73 cm' },
    mucha_seasons_posters:          { medium: 'Colour lithograph, set of four', dimensions: 'each 60 x 30 cm' },
    mucha_slav_epic_note:           { medium: 'Charcoal and gouache on board', dimensions: '50 x 40 cm' },
    munter_boating:                 { medium: 'Oil on canvas', dimensions: '80 x 60 cm' },
    munter_flowers_still_life:      { medium: 'Oil on canvas', dimensions: '46 x 38 cm' },
    munter_jawlensky:               { medium: 'Oil on canvas', dimensions: '70 x 60 cm' },
    rembrandt_night_watch_sketch:   { medium: 'Oil on canvas, reduced sketch', dimensions: '55 x 44 cm' },
    rembrandt_self_portrait:        { medium: 'Oil on canvas', dimensions: '66 x 53 cm' },
    rembrandt_three_trees:          { medium: 'Drypoint and etching', dimensions: '21 x 28 cm' },
    renoir_boating_party:           { medium: 'Oil on canvas', dimensions: '130 x 173 cm' },
    renoir_moulin_galette:          { medium: 'Oil on canvas', dimensions: '78 x 114 cm' },
    renoir_two_sisters:             { medium: 'Oil on canvas', dimensions: '100 x 81 cm' },
    turner_rain_steam_speed:        { medium: 'Oil on canvas', dimensions: '91 x 122 cm' },
    turner_temeraire:               { medium: 'Oil on canvas', dimensions: '91 x 122 cm' },
    turner_venice_laguna:           { medium: 'Watercolour on paper', dimensions: '22 x 30 cm' },
    van_gogh_irises:                { medium: 'Oil on canvas', dimensions: '71 x 93 cm' },
    van_gogh_starry_night_study:    { medium: 'Oil on canvas', dimensions: '73 x 92 cm' },
    van_gogh_sunflowers:            { medium: 'Oil on canvas', dimensions: '93 x 72 cm' },
    velazquez_cooking_eggs:         { medium: 'Oil on canvas', dimensions: '100 x 119 cm' },
    velazquez_man_in_black:         { medium: 'Oil on canvas', dimensions: '81 x 66 cm' },
    velazquez_meninas_bozzetto:     { medium: 'Oil on canvas, bozzetto', dimensions: '74 x 88 cm' },
    vermeer_love_letter:            { medium: 'Oil on canvas', dimensions: '44 x 38 cm' },
    vermeer_music_lesson_study:     { medium: 'Chalk and ink on paper', dimensions: '25 x 20 cm' },
    vermeer_pearl_earring_copy:     { medium: 'Oil on canvas, studio copy', dimensions: '44 x 39 cm' },
    watteau_cythera_reduction:      { medium: 'Oil on canvas, reduction', dimensions: '65 x 80 cm' },
    watteau_fete_champetre:         { medium: 'Oil on canvas', dimensions: '52 x 65 cm' },
    watteau_harlequin_study:        { medium: 'Red chalk on paper', dimensions: '26 x 19 cm' }
  };

  /* Auction and gallery plates that are scenes, not artworks. They are kept
     in the build and used as background art where a view has no picture of
     its own, so no supplied file is thrown away. */
  global.ART_RACE_SCENE_PLATES = [
    { id: 'auction_1', file: 'images/scenes/auktion1.jpg', title: 'Sale room, morning view' },
    { id: 'auction_2', file: 'images/scenes/auktion2.jpg', title: 'Sale room, the hammer falls' },
    { id: 'auction_3', file: 'images/scenes/auktion3.jpg', title: 'Bidding from the back row' },
    { id: 'auction_4', file: 'images/scenes/auktion4.jpg', title: 'The catalogue on view' },
    { id: 'auction_5', file: 'images/scenes/auktion5.jpg', title: 'Crates leaving the house' },
    { id: 'gallery_dream', file: 'images/scenes/gemini-generated-image-d71uabd71uabd71u.jpg', title: 'Gallery wall, night' }
  ];
})(window);
