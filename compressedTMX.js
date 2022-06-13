var customMapFormat = {
	name: "Compressed TileMap",
	extension: "tmx",

	write: function(map, fileName) {
		const counterMax = 256; //Make sure the counter can be stored in a uint8
		var layers = [];
		var tileId;
		var totalDataEntries = 0;
		var treeMap = [ //First is id of left tree top, 2nd is left top of tree repetition cluster of 3x2 tiles, last is left bottom of tree
			[2905, 3097, 3033], //3x3 green tree
			[2908, 3100, 3036], //3x3 green tree fancy
			[2911, 3103, 3039], //2x3 green tree
			[3217, 3219, 3345], //2x3 green tree round
		];

		for (var i = 0; i < map.layerCount; ++i) {
			var layer = map.layerAt(i);

			if (layer.isTileLayer) {
				var data = [];
				var previousTileId;
				var tileCounter = 0;
				var firstTile = true;
				var lastTile = false;
				var isTreeLayer = false;
				var treeRepetitions;

				//If the first tile is invisible with the tile id being 64, it is a tree layer
				if (layer.cellAt(0, 0).tileId == 64) {
					isTreeLayer = true;

					//The tuple (256,65356) at the beginning can be used as tree layer identifier because does not occur on a normal tile map
					data.push(256);
					data.push(65356);
					totalDataEntries += 2;
				}

				for (var x = 0; x < layer.width; x++) {
					for (var y = 0; y < layer.height; y++) {
						tileId = layer.cellAt(x, y).tileId + 1;

						//Optimize tree only layer compression to lower memory usage
						//A tree row is defined by 4 numbers: tileId of tree top, its x and y position and amount of tree repetitions
						if (isTreeLayer) {
							for (var n = 0; n < treeMap.length; n++) {
								var treeTop = treeMap[n][0];
								var treeRepetition = treeMap[n][1];
								var treeBottom = treeMap[n][2];

								switch(tileId) {
									case treeTop:
										treeRepetitions = 0;
										data.push(tileId);
										data.push(x);
										data.push(y);
										break;
									case treeRepetition:
										treeRepetitions++;
										break;
									case treeBottom:
										data.push(treeRepetitions);
										totalDataEntries += 4;
										break;
								}
							}
						} else { //Normal layer compression
							//Handle first and last tile
							if (firstTile) {
								previousTileId = tileId;
								firstTile = false;
							} else if (tileCounter < counterMax && x * y === (layer.width - 1) * (layer.height - 1)) {
								lastTile = true;
								tileCounter++; //Increment range for last tile
							}

							if (tileCounter === counterMax || lastTile || previousTileId !== tileId) {
								data.push(tileCounter);
								data.push(previousTileId);
								totalDataEntries += 2;
								previousTileId = tileId;
								tileCounter = 0;
							}

							tileCounter++;
						}
					}
				}

				//Add the tuple 8256,65356) at the end of a tree layer.
				if (isTreeLayer) {
					data.push(256);
					data.push(65356);
					totalDataEntries += 2;
				}

				layers.push(data);
			}
		}

		//Write array length as first array entry, because in C++ this becomes an incomplete array
		layers.unshift(totalDataEntries);

		//Parse data to XML
		var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';

		//Add comment to xml
		xml += `<!--Compressed version of the Tiled TMX format-->\n`;
		xml += `<!--The first layer shows the amount of total data entries.-->\n`;
		xml += `<!--The data itself is split into pairs. The first value shows the how often the tile is rendered in a row. The second is the tile id.-->\n`;
		xml += `<!--The highest repetition count is 255 to allow storing it in an unsigned 8bit integer. If a tile is repeated more often, it is split into several pairs.-->\n`;
		xml += `<!--Tree layers always starts and ends with the tuple (256,65356). A single tree information is a quadruple.-->\n`;
		xml += `<!--It consists of the tile id of the top left tree tile, its x/y position on the map and the amount of repetitions-->\n`;

		xml += `<map width="${map.width}" height="${map.height}">\n`;

		for (var i = 0; i < layers.length; i++) {
			xml += `\t<layer id="${i}">\n`;
			xml += `\t\t<data encoding="csv">\n\t\t\t`;
			xml += layers[i];
			
			if (i % map.width === map.width - 1) {
				xml += "\n";
			}

			xml += "\n\t\t</data>\n";
			xml += "\t</layer>\n";
		}

		xml += "</map>\n";

		var file = new TextFile(fileName, TextFile.WriteOnly);
		file.write(xml);
		file.commit();
	}
}

tiled.registerMapFormat("CTMX", customMapFormat)

