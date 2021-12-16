var customMapFormat = {
	name: "Compressed TileMap",
	extension: "tmx",

	write: function(map, fileName) {
		var layers = [];
		var tileId;
		var totalDataEntries = 0;

		for (var i = 0; i < map.layerCount; ++i) {
			var layer = map.layerAt(i);

			if (layer.isTileLayer) {
				var data = [];
				var previousTileId;
				var tileCounter = 0;
				var firstTile = true;
				var lastTile = false;

				for (var x = 0; x < layer.width; x++) {
					for (var y = 0; y < layer.height; y++) {
						tileId = layer.cellAt(x, y).tileId + 1;

						//Handle first and last tile
						if (firstTile) {
							previousTileId = tileId;
							firstTile = false;
						} else if (x * y === (layer.width - 1) * (layer.height - 1)) {
							lastTile = true;
							tileCounter++; //Increment range for last tile
						}

						if (lastTile || previousTileId !== tileId) {
							data.push(tileCounter);
							data.push(previousTileId);
							totalDataEntries += 2;
							previousTileId = tileId;
							tileCounter = 0;
						}

						tileCounter++;
					}
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

		xml += "</map>";

		var file = new TextFile(fileName, TextFile.WriteOnly);
		file.write(xml);
		file.commit();
	}
}

tiled.registerMapFormat("CTMX", customMapFormat)

