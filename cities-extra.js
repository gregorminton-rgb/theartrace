/* =========================================================================
 * cities-extra.js — art-trade cities the web build adds to the generated data.
 *
 * data.js is generated and only knows the
 * thirteen cities that have a full city definition. Three
 * more master plates ship with the game art (städte\lissabon.jpg, rio.jpg,
 * sanfrancisco.jpg) and behave exactly like the generated cities: dealer,
 * auction house, bank, studio, expert office.
 *
 * This file MUST load after data.js and before engine.js — engine.js merges
 * the list into ART_DATA.cities before it builds its lookup tables and its
 * per-city wealth/style fields, so a city declared here is indistinguishable
 * from an exported one everywhere else in the game.
 * ========================================================================= */
(function (global) {
  'use strict';

  global.ART_RACE_EXTRA_CITIES = [
    {
      id: 'lissabon',
      name: 'Lissabon',
      country: 'Portugal',
      region: 0,
      regionName: 'Europe',
      description: 'Old navigator money: the dealers here pay for Baroque and for anything with a Portuguese story.',
      mapX: 0.4747, mapY: 0.7150,
      wealth: 6,
      wealthMultiplier: 0.9756,
      styleBias: 0.38,
      favouriteEpochs: ['Baroque', 'Renaissance'],
      bohemianEpochs: ['Modern'],
      hasAuctionHouse: true,
      hasBank: true,
      hasRestorationStudio: false,
      hasExpertOffice: false,
      dealerStockSize: 5,
      theme: [0.66, 0.53, 0.36],
      accent: [0.88, 0.78, 0.5],
      ground: [1, 1, 1]
    },
    {
      id: 'rio',
      name: 'Rio de Janeiro',
      country: 'Brazil',
      region: 1,
      regionName: 'Americas',
      description: 'A small but hungry market: religious art and portraits move fast, big names do not.',
      mapX: 0.3800, mapY: 0.3728,
      wealth: 5,
      wealthMultiplier: 0.9024,
      styleBias: 0.34,
      favouriteEpochs: ['Baroque', 'Romanticism'],
      bohemianEpochs: ['Impressionism'],
      hasAuctionHouse: true,
      hasBank: false,
      hasRestorationStudio: true,
      hasExpertOffice: false,
      dealerStockSize: 4,
      theme: [0.60, 0.55, 0.38],
      accent: [0.88, 0.78, 0.5],
      ground: [1, 1, 1]
    },
    {
      id: 'sanfrancisco',
      name: 'San Francisco',
      country: 'USA',
      region: 1,
      regionName: 'Americas',
      description: 'New Pacific money: pays over the odds for landscapes and Moderns, and never asks where a crate came from.',
      mapX: 0.1600, mapY: 0.7100,
      wealth: 8,
      wealthMultiplier: 1.2422,
      styleBias: 0.44,
      favouriteEpochs: ['Impressionism', 'Modern'],
      bohemianEpochs: ['Romanticism'],
      hasAuctionHouse: true,
      hasBank: true,
      hasRestorationStudio: true,
      hasExpertOffice: true,
      dealerStockSize: 6,
      theme: [0.67, 0.55, 0.39],
      accent: [0.88, 0.78, 0.5],
      ground: [1, 1, 1]
    }
  ];
})(window);
