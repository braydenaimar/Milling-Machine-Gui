/**
 *   ____       _                       _                  ____            _       _
 *  |  _ \  ___| |__  _   _  __ _      | | __ ___   ____ _/ ___|  ___ _ __(_)_ __ | |_
 *  | | | |/ _ \ '_ \| | | |/ _` |  _  | |/ _` \ \ / / _` \___ \ / __| '__| | '_ \| __|
 *  | |_| |  __/ |_) | |_| | (_| | | |_| | (_| |\ V / (_| |___) | (__| |  | | |_) | |_
 *  |____/ \___|_.__/ \__,_|\__, |  \___/ \__,_| \_/ \__,_|____/ \___|_|  |_| .__/ \__|
 *                          |___/                                           |_|
 *
 *  @author Brayden Aimar
 */


define([ 'jquery' ], ($) => {

	console.log('running debug.js');


	this.gui = {

		escGroup() {

			for (let i = 0; i < 10; i++) {

				console.groupEnd();

			}

		},

		resizeWidgetDom() {

			console.log('Resizing widget DOM.');

		},

		parseObject(data, indentLevel, parseFilter) {

			// console.group("parseObject");

			// parseObject( [data] )
			// parseObject( [data], [indentLevel] )
			// parseObject( [data], [parseFilter] )
			// parseObject( [data], [indentLevel], [parseFilter] )

			// Arg. data [array/object] - The object that is to be parsed into readable text.
			// Arg. indentLevel [number/string] [optional] - The number of spaces to indent the parsed object by.
			// Arg. parseFilter [array] [optional] - The indexs/object names of whatever you do not want to have logged.

			// TODO:160 If the indentLevel argument is omitted, parse object to a single line.
			// TODO:270 Pass a 'showType' argument.

			// TODO:330 Sort objects based on the sortOrder array before parsing.
			const sortOrder = [ [ 'Cmd', 'Port', 'Baud', 'Buffer' ], [ 'Desc' ] ];

			// If the parseFilter argument was omitted, and the indentLevel argument is [object], assume the indentLevel argument has been passed as the parseFilter argument.
			if (parseFilter === undefined && typeof indentLevel == 'object' && Array.isArray(indentLevel)) {

				parseFilter = indentLevel;
				// If the parseFilter argument is given and the indentLevel argument is [array/object], throw an error.

			} else if (typeof indentLevel == 'object') {

				throw new Error('The indentLevel argument needs to be a string or number.');

			}

			if (typeof data == 'object' && Array.isArray(data)) {

				var dataType = 'array';

			} else {

				var dataType = typeof data;

			}

			let parseFilterKeep = [];
			let parseFilterDiscard = [];
			// If the parseFilter argument was passed and it is not an [array], throw an error.
			if (parseFilter !== undefined && typeof parseFilter != 'object') {

				throw new Error('The parseFilter argument needs to be an object. ex.["AvailableBufferAlgorithms"] or ex.{ keep: ["AvailableBufferAlgorithms"] }');

			// If the parseFilter argument is [object].

			} else if (parseFilter !== undefined && !Array.isArray(parseFilter)) {

				$.each(parseFilter, (parseFilterIndex, parseFilterItem) => {

					const subParseFilter = [];
					for (let i = 0; i < parseFilterItem.length; i++) {

						subParseFilter.push(parseFilterItem[i]);

					}
					if (parseFilterIndex == 'keep') {

						parseFilterKeep = subParseFilter;

					} else if (parseFilterIndex == 'discard') {

						parseFilterDiscard = subParseFilter;

					} else {

						throw new Error("The parseFilter object property names must be either:\n  a) 'keep'\n  b) 'discard'");

					}

				});


			// If the parseFilter argument is [array].

			} else if (parseFilter !== undefined && Array.isArray(parseFilter)) {

				parseFilterDiscard = parseFilter;

			}
			// console.log("keep:", parseFilterKeep);
			// console.log("discard:", parseFilterDiscard);
			// console.log("dataType: " + dataType);

			// console.log("data:", data, "[" + dataType + "]\nindent: " + indentLevel + " [" + typeof indentLevel + " ]parseFilter:", parseFilter, "[" + typeof parseFilter + "]");

			let parsedData = '';

			if (typeof indentLevel == 'number') {

				var indent = `\n${' '.repeat(indentLevel)}`;

			} else if (typeof indentLevel == 'string') {

				var indent = indentLevel;

			} else {

				var indent = '\n';

			}

			// If the data argument is [array], parse it as [array[...]].
			if (typeof data == 'object' && Array.isArray(data)) {

				$.each(data, (dataIndex, dataItem) => {

					// console.log("  dataIndex:", dataIndex, " typeof:", typeof(dataIndex), "\n  dataItem:", dataItem, " typeof:", typeof(dataItem));
					if (parseFilterKeep.length && typeof dataIndex == 'string' && parseFilterKeep.indexOf(dataIndex) == -1) return true;
					if (parseFilterDiscard.indexOf(dataIndex) != -1) return true;

					// If dataItem is [object], parse the data object as [array[objects[string/number/array[string/number/objects[string/number]]]]].
					if (typeof dataItem == 'object') {

						parsedData += `${indent}[${dataIndex}]`;
						$.each(dataItem, (index, item) => {

							// If the name of this object matches one of the parseFilter, do not parse it.
							if (parseFilterKeep.length && typeof index == 'string' && parseFilterKeep.indexOf(index) == -1) return true;
							if (parseFilterDiscard.indexOf(index) != -1) return true;

							let parsedItem = '';

							if (Array.isArray(item)) {

								// I would explain whats going on here but dat nestin' tho.
								$.each(item, (subIndex, subItem) => {

									if (parseFilterKeep.length && typeof subIndex == 'string' && parseFilterKeep.indexOf(subIndex) == -1) return true;
									if (parseFilterDiscard.indexOf(subIndex) != -1) return true;

									if (typeof subItem == 'object') {

										let parsedSubItem = '{';
										$.each(subItem, (subSubIndex, subSubItem) => {

											// Welcome to the fourth level of nested loop hell.
											if (parseFilterKeep.length && typeof subSubIndex == 'string' && parseFilterKeep.indexOf(subSubIndex) == -1) return true;
											if (parseFilterDiscard.indexOf(subSubIndex) != -1) return true;
											parsedSubItem += (parsedSubItem == '{') ? ' ' : ', ';
											parsedSubItem += `${subSubIndex}: ${subSubItem}`;
											// TODO:80 Create the fith level of nested loop hell.

										});
										parsedSubItem += ' }';
										parsedItem += (parsedItem) ? `, ${parsedSubItem}` : `[ ${parsedSubItem}`;

									} else {

										parsedItem += (parsedItem) ? `, ${subItem}` : `[ ${subItem}`;

									}

								});
								parsedItem += ' ]';

							} else {

								parsedItem = item;

							}
							parsedData += `${indent}  ${index}: ${parsedItem}`;

						});


					// If the data argument is [array[string/number]] and the indentLevel argument is omitted, list elements on a single line with comma-space seperations between each element.

					} else if (indentLevel === undefined) {

						parsedData += (parsedData) ? `, ${dataItem}` : `[ ${dataItem}`;

					// If the data argument is [array[string/number]] and the indentLevel argument is given, list elements on seperate lines.

					} else {

						parsedData += `${indent}[${dataIndex}]: ${dataItem}`;

					}


				});

				// If the data argument is an empty [object], return empty '[]' without a newline character.
				if (!data.length) {

					parsedData = ' [ ]';

				// If the data argument is [array[string/number]], add an ']' to close the array line.

				} else if (parsedData.slice(0, 1) == '[') {

					parsedData += ' ]';

				}

			// If the data argument is [object], parse it as such.

			} else if (typeof data == 'object') {

				$.each(data, (dataIndex, dataItem) => {

					// console.log(" dataIndex: " + dataIndex + " [" + typeof dataIndex + "]\n  dataItem:", dataItem, " [" + typeof dataItem + "]");
					if (parseFilterKeep.length && typeof dataIndex == 'string' && parseFilterKeep.indexOf(dataIndex) == -1) return true;
					if (parseFilterDiscard.indexOf(dataIndex) != -1) return true;

					let parsedSubData = '';

					// If the data argument is [object[objects]], parse as such.
					if (typeof dataItem == 'object') {

						$.each(dataItem, (subDataIndex, subDataItem) => {

							if (parseFilterKeep.length && typeof subDataIndex == 'string' && parseFilterKeep.indexOf(subDataIndex) == -1) return true;
							if (parseFilterDiscard.indexOf(subDataIndex) != -1) return true;

							// If the data argument is [object[objects[array]]], parse as such.
							if (typeof subDataItem == 'object' && Array.isArray(subDataItem)) {

								var parsedSub1Data = '';
								$.each(subDataItem, (sub1DataIndex, sub1DataItem) => {

									if (parseFilterKeep.length && typeof sub1DataIndex == 'string' && parseFilterKeep.indexOf(sub1DataIndex) == -1) return true;
									if (parseFilterDiscard.indexOf(sub1DataIndex) != -1) return true;

									parsedSub1Data += (parsedSub1Data) ? `, ${sub1DataItem}` : `[ ${sub1DataItem}`;

								});
								parsedSub1Data = (parsedSub1Data) ? `${parsedSub1Data} ]` : '[ ]';

							} else {

								var parsedSub1Data = subDataItem;

							}
							parsedSubData += `${indent}  ${subDataIndex}: ${parsedSub1Data}`;

						});
						parsedData += `${indent}{${dataIndex}}`;
						parsedData += parsedSubData;

					// If the data argument is [object[string/number]], parse as such.

					} else {

						parsedData += `${indent + dataIndex}: ${dataItem}`;

					}

				});

			// If the data argument is not [array/object] (aka. data is [string/number]), return the indent combined with the data.

			} else {

				parsedData = indent + data;

			}

			// console.groupEnd();
			return parsedData;

		}
	};

	// module.exports = this.mymodule;

});
