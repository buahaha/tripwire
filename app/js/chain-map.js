var chain = new function() {
	this.map, this.view, this.options, this.drawing, this.data = {};

	this.newView = function(json) {
		this.view = new google.visualization.DataView(new google.visualization.DataTable(json));
		return this.view;
	};

	this.activity = function(data) {
		/*	function for adding recent activity to chain map nodes	*/
		//var data = typeof(data) !== "undefined" ? data : this.data.activity;

		// Hide all activity colored dots instead of checking each one
		var elements = document.querySelectorAll("#chainMap .nodeActivity span");
		for (var i = 0, l = elements.length; i < l; ++i) {
		   elements[i].className = elements[i].className + " invisible";
		}

		// Loop through passed data and show dots by system
		var elements = document.querySelectorAll("#chainMap [data-nodeid]");
		for (var i = 0, l = elements.length; i < l; ++i) {
		   var systemID = elements[i].getAttribute("data-nodeid");
		   if (data[systemID]) {
			   var shipJumps = data[systemID].shipJumps;
			   var podKills = data[systemID].podKills;
			   var shipKills = data[systemID].shipKills;
			   var npcKills = data[systemID].npcKills;
			   var node = elements[i].getElementsByClassName("nodeActivity")[0];

			   if (shipJumps > 0) {
				   var jumps = node.getElementsByClassName("jumps")[0];
				   jumps.className = jumps.className.replace(/invisible/g, "");
				   jumps.setAttribute("data-tooltip", shipJumps + " Jumps");
			   }

			   if (podKills > 0) {
				   var pods = node.getElementsByClassName("pods")[0];
				   pods.className = pods.className.replace(/invisible/g, "");
				   pods.setAttribute("data-tooltip", podKills + " Pod Kills");
			   }

			   if (shipKills > 0) {
				   var ships = node.getElementsByClassName("ships")[0];
				   ships.className = ships.className.replace(/invisible/g, "");
				   ships.setAttribute("data-tooltip", shipKills + " Ship Kills");
			   }

			   if (npcKills > 0) {
				   var npcs = node.getElementsByClassName("npcs")[0];
				   npcs.className = npcs.className.replace(/invisible/g, "");
				   npcs.setAttribute("data-tooltip", npcKills + " NPC Kills");
			   }
		   }
		}

		if (SystemActivityToolTips.attachedElements && SystemActivityToolTips.attachedElements.length > 0) {
			SystemActivityToolTips.detach($("#chainMap .whEffect"));
		}
		SystemActivityToolTips.attach($("#chainMap .nodeActivity > span[data-tooltip]:not(.invisible)"));

		return data;
	}

	this.occupied = function(data) {
		/*	function for showing occupied icon  */

		// Hide all icons instead of checking each one
		$("#chainMap [data-icon='user'], #chainMap [data-icon='user'] + .badge").addClass("invisible");

		// Loop through passed data and show icons
		for (var x in data) {
			$("#chainMap [data-nodeid='"+data[x].systemID+"'] [data-icon='user']").removeClass("invisible");
			$("#chainMap [data-nodeid='"+data[x].systemID+"'] [data-icon='user'] + .badge").removeClass("invisible").html(data[x].count);
		}

		OccupiedToolTips.attach($("#chainMap [data-icon='user']:not(.invisible)"));

		return data;
	}

	this.flares = function(data) {
		/*	function for coloring chain map nodes via flares  */
		//var data = typeof(data) !== "undefined" ? data : this.data.flares;

		// Remove all current node coloring instead of checking each one
		$("#chainMap td.node").removeClass("redNode yellowNode greenNode");

		// Remove all coloring from chain grid
		$("#chainGrid tr").removeClass("red yellow green");

		// Loop through passed data and add classes by system
		if (data) {
			for (var x in data.flares) {
				var systemID = data.flares[x].systemID;
				var flare = data.flares[x].flare;

				var row = ($("#chainMap [data-nodeid="+systemID+"]").parent().addClass(flare+"Node").parent().index() - 1) / 3 * 2;

				if (row > 0) {
					$("#chainGrid tr:eq("+row+")").addClass(flare).next().addClass(flare);
				}
			}
		}

		return data;
	}

	this.grid = function() {
		/*  function for showing/hiding grid lines  */
		// This is an optional feature
		if (options.chain.gridlines == false) {
			$("#chainGrid tr").addClass("hidden");
			return false;
		}

		$("#chainGrid tr").removeClass("hidden");
		//$("#chainGrid").css("width", "100%");

		// Calculate how many rows have systems, max 0 hack to prevent negative numbers, and rows above this number get hidden
		var rows = Math.max(0, $(".google-visualization-orgchart-table tr:has(.node)").length * 2 - 1);
		$("#chainGrid tr:gt("+rows+")").addClass("hidden");
	}

	this.lines = function(data) {
		//var data = typeof(data) !== "undefined" ? data : this.data.lines;

		function drawNodeLine(system, parent, mode, signatureID) {
			/*	function for drawing colored lines  */

			// Find node in chainmap
			//var $node = $("#chainMap [data-nodeid='"+system+"']").parent();
			var $node = $("#chainMap #node"+system).parent();

			if ($node.length == 0) {
				return false;
			}

			// Get node # in this line
			var nodeIndex = Math.ceil(($node[0].cellIndex + 1) / 2 - 1);

			// applly to my top line
			var $connector = $($node.parent().prev().children("td.google-visualization-orgchart-lineleft, td.google-visualization-orgchart-lineright")[nodeIndex]).addClass("left-"+mode+" right-"+mode);
			//var $connector = $($node.parent().prev().find("td:not([colspan])")[nodeIndex]).addClass("left-"+mode+" right-"+mode).attr("data-signatureid", signatureID);

			// Find parent node
			//var $parent = $("#chainMap [data-nodeid='"+parent+"']").parent();
			var $parent = $("#chainMap #node"+parent).parent();

			if ($parent.length == 0 || $connector.length == 0)
				return false;

			// Find the col of my top line
			var nodeCol = 0, connectorCell = $connector[0].cellIndex;
			$node.parent().prev().find("td").each(function(index) {
				nodeCol += this.colSpan;

				if (index == connectorCell) {
					return false;
				}
			});

			// Get node # in this line
			var parentIndex = Math.ceil(($parent[0].cellIndex + 1) / 2 - 1);

			// Compensate for non-parent nodes (slight performance hit ~10ms)
			var newparentIndex = parentIndex;
			for (var i = 0; i <= parentIndex; i++) {
				var checkSystem = 0;//$node.parent().prev().prev().prev().find("td:has([data-nodeid]):eq("+i+")").find("[data-nodeid]").data("nodeid");
				$node.parent().prev().prev().prev().find("td > [data-nodeid]").each(function(index) {
					if (index == i) {
						checkSystem = $(this).attr("id").replace("node", "");//$(this).data("nodeid");

						return false;
					}
				});

				if ($.map(data.map.rows, function(node) { return node.c[1].v == checkSystem ? node : null; }).length <= 0) {
					newparentIndex--;
				}
			}
			parentIndex = newparentIndex;

			// Apply to parent bottom line
			var $connecte = $($node.parent().prev().prev().children("td.google-visualization-orgchart-lineleft, td.google-visualization-orgchart-lineright")[parentIndex]).addClass("left-"+mode+" right-"+mode);
			//var $connecte = $($node.parent().prev().prev().find("td:not([colspan])")[parentIndex]).addClass("left-"+mode+" right-"+mode).attr("data-signatureid", signatureID);

			// the beans
			var col = 0, parent = false, me = false;
			$node.parent().prev().prev().find("td").each(function(index, value) {
				col += this.colSpan;

				if (me && parent) {
					// All done - get outta here
					return false;
				} else if (typeof($connecte[0]) != "undefined" && $connecte[0].cellIndex == index) {
					parent = true;

					$(this).addClass("left-"+mode);

					// remove bottom border that points to the right
					if (!me && col != nodeCol) {
						$(this).addClass("bottom-"+mode);
					}

					// parent and node are same - we are done
					if (nodeCol == col) {
						return false;
					}
				} else if (col == nodeCol) {
					me = true;

					$(this).addClass("bottom-"+mode);
				} else if (me || parent) {
					var tempCol = 0, breaker = false, skip = false;

					$node.parent().prev().find("td").each(function(index) {
						tempCol += this.colSpan;

						if (tempCol == col && ($(this).hasClass("google-visualization-orgchart-lineleft") || $(this).hasClass("google-visualization-orgchart-lineright"))) {
							if (parent == false) {
								// Stop looking cuz there is another node between us and parent
								breaker = true;
								$connecte.removeClass("left-"+mode+" right-"+mode);

								return false;
							} else if (parent == true) {
								// Lets make sure there isnt a node between the parent and me
								$connecte.removeClass("left-"+mode+" right-"+mode);

								$node.parent().prev().prev().find("td").each(function(index) {
									if (index >= $connecte[0].cellIndex) {
										// there is a node after parent but before me
										$(this).removeClass("bottom-"+mode);
									}
								});
								skip = true;
							}
						}
					});

					if (breaker) {
						return false;
					}

					if (!skip) {
						$(this).addClass("bottom-"+mode);
					}
				}
			});
		}

		for (var x in data.lines) {
			drawNodeLine(data.lines[x][0], data.lines[x][1], data.lines[x][2], data.lines[x][3]);
		}
	}

	this.nodes = function(map) {
		var chain = {cols: [{label: "System", type: "string"}, {label: "Parent", type: "string"}], rows: []};
		var frigTypes = ["Q003", "E004", "L005", "Z006", "M001", "C008", "G008", "A009", "SML", "MED", "LRG", "XLG"];
		var connections = [];
		var chainMap = this;

		function formatStatics(statics) {
			if(!statics) { return ''; }
			const shortCodeMap = { 'High-Sec': 'H', 'Low-Sec': 'L', 'Null-Sec': 'N',
				'Class 1': '1', 'Class 2': '2', 'Class 3': '3', 'Class 4': '4', 'Class 5' : 5, 'Class 6': 6
			};
			const classMap = { H: 'hisec', L: 'lowsec', N: 'nullsec'};
			return statics.map(function(s) {
				const text = shortCodeMap[tripwire.wormholes[s].leadsTo];
				const className = classMap[text] || 'class-' +  text;
				const tip = tripwire.wormholes[s].leadsTo + ' via ' + s;
				return '<span class="' + className + '" data-tooltip="' + tip + '">' + text + '</span>';
			}).join('');
		}

		function topLevel(systemID, id) {
			if (!systemID || !tripwire.systems[systemID])
				return false;
			const tabName = options.chain.tabs[options.chain.active] && options.chain.tabs[options.chain.active].systemID != 0 ? options.chain.tabs[options.chain.active].name : undefined;
			return makeSystemNode(systemID, id, null, tabName, '&nbsp;');
		}

		function makeSystemNode(systemID, id, sigId, systemName, nodeTypeMarkup) {
			// System type switch
			var systemType = getSystemType(systemID);
			const system = tripwire.systems[systemID];

			var effectClass = null, effect = null;
			if (system && system.effect) {
				switch(system.effect) {
					case "Black Hole":
						effectClass = "blackhole";
						break;
					case "Cataclysmic Variable":
						effectClass = "cataclysmic-variable";
						break;
					case "Magnetar":
						effectClass = "magnetar";
						break;
					case "Pulsar":
						effectClass = "pulsar";
						break;
					case "Red Giant":
						effectClass = "red-giant";
						break;
					case "Wolf-Rayet Star":
						effectClass = "wolf-rayet";
						break;
				}

				effect = system.effect;
			}

			var node = {v: id};
			var chainNode = "<div id='node"+id+"' data-nodeid='"+systemID+"'"+(sigId ? " data-sigid='"+sigId+"'" : null)+">"
							+	"<div class='nodeIcons'>"
							+		"<div style='float: left;'>"
							+			"<i class='whEffect' "+(effectClass ? "data-icon='"+effectClass+"' data-tooltip='"+effect+"'" : null)+"></i>"
							+		"</div>"
							+		"<div style='float: right;'>"
							+			"<i data-icon='user' class='invisible'></i>"
							+			"<span class='badge invisible'></span>"
							+		"</div>"
							+	"</div>"
							+	"<h4 class='nodeClass'>"+systemType+"</h4>"
							+	"<h4 class='nodeSystem'>"
							+		(system ? "<a href='.?system="+system.name+"'>"+(systemName ? systemName : system.name)+"</a>" : systemName ? systemName : '&nbsp;')
							+	"</h4>"
							+	"<h4 class='nodeType'>" + nodeTypeMarkup + "</h4>"
							+	"<div class='statics'>"
							+ formatStatics(system ? system.statics : [])
							+	"</div>"
							+	"<div class='nodeActivity'>"
							+		"<span class='jumps invisible'>&#9679;</span>&nbsp;<span class='pods invisible'>&#9679;</span>&nbsp;&nbsp;<span class='ships invisible'>&#9679;</span>&nbsp;<span class='npcs invisible'>&#9679;</span>"
							+	"</div>"
							+"</div>"

			node.f = chainNode;

			return node;
		}
		
		function makeCalcChildNode(childID, node, targetSystem) {
			var path = guidance.findShortestPath(tripwire.map.shortest, [targetSystem - 30000000, node.child.systemID - 30000000]);
			
			var calcNode = {};
			calcNode.life = "Gate";
			calcNode.parent = {};
			calcNode.parent.id = node.child.id;
			calcNode.parent.systemID = node.child.systemID;
			calcNode.parent.name = node.child.name;
			calcNode.parent.type = node.child.type;
			calcNode.parent.nth = node.child.nth;

			calcNode.child = {};
			calcNode.child.id = ++childID;
			calcNode.child.systemID = targetSystem;
			calcNode.child.name = tripwire.systems[targetSystem].name;
			calcNode.child.path = path;
			calcNode.child.jumps = path.length - 1;
			calcNode.child.nth = null;			
			
			return { childID, calcNode };
		}
		
		function getSystemType(systemID) {
			const system = tripwire.systems[systemID];
			var leadsToPointer = typeof(systemID) === "string" && systemID.indexOf("|") >= 0 ? tripwire.aSigSystems[systemID.substring(0, systemID.indexOf("|"))] : null;
			const nodeClass = system ? system.class : 
				leadsToPointer && leadsToPointer.substring(0, 6) == 'Class-' ? 1 * leadsToPointer.substring(6) :
				undefined;
			const nodeSecurity = system ? system.security : 
				leadsToPointer == "High-Sec" ? 0.8 :
				leadsToPointer == "Low-Sec" ? 0.4 :
				leadsToPointer == "Null-Sec" ? -0.1 :
				undefined;
				
			if (nodeClass)
				return "<span class='wh class-" + nodeClass + "'>C" + nodeClass + "</span>";
			else if (nodeSecurity >= 0.45)
				return "<span class='hisec'>HS</span>";
			else if (nodeSecurity > 0.0)
				return "<span class='lowsec'>LS</span>";
			else if (nodeSecurity <= 0.0)
				return "<span class='nullsec'>NS</span>";
			else return '&nbsp;';	// unknown
		}		

		function findLinks(system) {
			if (system[0] <= 0) return false;

			var parentID = parseInt(system[1]), childID = chainList.length;

			for (var x in chainData) {
				var wormhole = chainData[x];				
				if ($.inArray(wormhole.id, usedLinks) == -1) {
					var sig1, sig2, sig1Type, sig2Type,
						parent, child, parentType, childType;
					if (wormhole.parent == "secondary") {
						sig1 = tripwire.client.signatures[wormhole.secondaryID];
						sig2 = tripwire.client.signatures[wormhole.initialID];
					} else {
						sig1 = tripwire.client.signatures[wormhole.initialID];
						sig2 = tripwire.client.signatures[wormhole.secondaryID];
					}
					sig1Type = wormhole.type; sig2Type = 'K162';
					
					if (sig1 && sig1.systemID == system[0]) {
						parent = sig1; child = sig2;
						parentType = sig2Type; childType = sig1Type;
					} else if(sig2 && sig2.systemID == system[0]) {
						parent = sig2; child = sig1;
						childType = sig2Type; parentType = sig1Type;
					} else { continue; }
					
					var node = {};
					node.id = wormhole.id;
					node.life = wormhole.life;
					node.mass = wormhole.mass;
					node.time = parent.modifiedTime;

					node.parent = {};
					node.parent.id = parentID;
					node.parent.systemID = tripwire.systems[parent.systemID] ? parent.systemID : parent.systemID + "|" + Math.floor(Math.random() * Math.floor(10000));
					node.parent.name = parent.name;
					node.parent.type = parentType;
					node.parent.typeBM = null;
					node.parent.classBM = null;
					node.parent.nth = null;
					node.parent.signatureID = child.signatureID;

					node.child = {};
					node.child.id = ++childID;
					node.child.systemID = tripwire.systems[child.systemID] ? child.systemID : child.systemID + "|" + Math.floor(Math.random() * Math.floor(10000));
					node.child.name = child.name;
					node.child.type = childType;
					node.child.typeBM = null;
					node.child.classBM = null;
					node.child.nth = null;
					node.child.signatureID = parent.signatureID;

					chainLinks.push(node);
					chainList.push([node.child.systemID, node.child.id, system[2]]);
					usedLinks.push(node.id);
					// usedLinks[system[2]].push(node.id);

					if ($("#show-viewing").hasClass("active") && tripwire.systems[node.child.systemID] && !tripwire.systems[viewingSystemID].class && !tripwire.systems[node.child.systemID].class) {
						var calcNode = makeCalcChildNode(childID, node, viewingSystemID);
						childID = calcNode.childID;

						chainLinks.push(calcNode.calcNode);
						chainList.push([0, childID]);
					}

					if ($("#show-favorite").hasClass("active") && tripwire.systems[node.child.systemID]) {
						for (var x in options.favorites) {
							if (tripwire.systems[options.favorites[x]].regionID >= 11000000 || tripwire.systems[node.child.systemID].regionID >= 11000000)
								continue;

							var calcNode = makeCalcChildNode(childID, node, options.favorites[x]);
							childID = calcNode.childID;

							chainLinks.push(calcNode.calcNode);
							chainList.push([0, childID]);
						}
					}
				}
			}
		}
		
		if ($("#chainTabs .current").length > 0) {
			var systems = $("#chainTabs .current .name").data("tab").toString().split(",");
			var chainList = [];
			var chainData = map;
			var chainLinks = [];
			var usedLinks = [];

			if (systems == 0) {
                                let i = 0;
                                Object.keys(map).slice()/*.reverse()*/.forEach(x => {
				        const parent = tripwire.client.signatures[map[x].initialID];
				        const child = tripwire.client.signatures[map[x].secondaryID];
                                        if (parent && tripwire.systems[parent.systemID] && typeof(tripwire.systems[parent.systemID].class) == "undefined") {
						i++;
						// usedLinks[parent.systemID] = [];
						chain.rows.push({c: [topLevel(parent.systemID, i), {v: null}]});
						chainList.push([parent.systemID, i, parent.systemID]);
                                        } else if (child && tripwire.systems[child.systemID] && typeof(tripwire.systems[child.systemID].class) == "undefined") {
				  	        i++;
				  		// usedLinks[child.systemID] = [];
						chain.rows.push({c: [topLevel(child.systemID, i), {v: null}]});
						chainList.push([child.systemID, i, child.systemID]);
					}
				});
			} else {
				for (var x in systems) {
					// usedLinks[systems[x]] = [];
					chain.rows.push({c: [topLevel(systems[x], parseInt(x) + 1), {v: null}]});
					chainList.push([systems[x], parseInt(x) + 1, systems[x]]);
				}
			}

			for (var i = 0; i < chainList.length; i++) {
				findLinks(chainList[i]);
			}
		} else {
			$("#chainError").hide();

			var row = {c: []};
			var systemID = viewingSystemID;

			row.c.push(topLevel(systemID, 1), {v: null});

			chain.rows.push(row);

			var chainList = [[systemID, 1]];
			var chainData = map;
			var chainLinks = [];
			var usedLinks = [];

			for (var i = 0; i < chainList.length; ++i) {
				findLinks(chainList[i]);
			}
		}

		for (var x in chainLinks) {
			var node = chainLinks[x];
			var row = {c: []};
			
			const nodeTypeMarkup = node.child.path ? 
				chainMap.renderPath(node.child.path) :
				options.chain["node-reference"] == "id" ? (node.child.signatureID ? node.child.signatureID.substring(0, 3) : "&nbsp;") :
				(node.child.type || "&nbsp;") + sigFormat(node.child.typeBM, "type") || "&nbsp;";
			const child = makeSystemNode(node.child.systemID, node.child.id, node.id, node.parent.name, nodeTypeMarkup);

			var parent = {v: node.parent.id};

			row.c.push(child, parent);
			chain.rows.push(row);

			if (node.life == "critical" && ($.inArray(node.parent.type, frigTypes) != -1 || $.inArray(node.child.type, frigTypes) != -1))
				connections.push(Array(child.v, parent.v, "eol-frig", node.id));
			else if (node.life == "critical" && node.mass == "critical")
				connections.push(Array(child.v, parent.v, "eol-critical", node.id));
			else if (node.life == "critical" && node.mass == "destab")
				connections.push(Array(child.v, parent.v, "eol-destab", node.id));
			else if ($.inArray(node.parent.type, frigTypes) != -1 || $.inArray(node.child.type, frigTypes) != -1)
				connections.push(Array(child.v, parent.v, "frig", node.id));
			else if (node.life == "critical")
				connections.push(Array(child.v, parent.v, "eol", node.id));
			else if (node.mass == "critical")
				connections.push(Array(child.v, parent.v, "critical", node.id));
			else if (node.mass == "destab")
				connections.push(Array(child.v, parent.v, "destab", node.id));
			else if (node.life == "Gate" || node.parent.type == "GATE" || node.child.type == "GATE")
				connections.push(Array(child.v, parent.v, "gate", node.id));
			//else
			//	connections.push(Array(child.v, parent.v, "", node.id));
		}

		// Apply critical/destab line colors
		connections.reverse(); // so we apply to outer systems first

		//this.data.map = chain;
		//this.data.lines = connections;
		return {"map": chain, "lines": connections};
	}

	this.renderPath = function(path) {
		if(path.length <= 1 || path.length > options.chain.routingLimit) { return '' + path.length - 1; }
		else {
			var systemMarkup = path
			.slice(0, path.length - 1).reverse()
			.map(function(s) {
				var system = appData.systems[30000000 + 1 * s];
				var securityClass = system.security >= 0.45 ? 'hisec' :
					system.security >= 0.0 ? 'lowsec' :
					'nullsec';
				return '<span class="' + securityClass + '" data-tooltip="' + system.name + ' (' + system.security + ')">&#x25a0</span>';
			});
			var r = '<span class="path">';
			for(var i = 0; i < systemMarkup.length; i++) {
				if(i > 0 && 0 == i % 5) { r += '|'; }
				
				r += systemMarkup[i];				 
			}
			return r + '</span>';
		}
	}

	this.redraw = function() {
		var data = $.extend(true, {}, this.data);
		data.map = $.extend(true, {}, data.rawMap);

		this.draw(data);
	}
	
	var drawRetryTimer = null;

	this.draw = function(data) {
		var data = typeof(data) !== "undefined" ? data : {};
		clearTimeout(drawRetryTimer);

		// We need to make sure Google chart is ready and we have signature data for this system before we begin, otherwise delay
		if (!this.map || (Object.size(data.map) && !tripwire.client.signatures)) {
			drawRetryTimer = setTimeout(function() { chain.draw(data) }, 100);
			return;
		}

		if (data.map) {
			this.drawing = true;

			this.data.rawMap = $.extend(true, {}, data.map);

			// if (options.chain.active == null || (options.chain.tabs[options.chain.active] && options.chain.tabs[options.chain.active].evescout == false)) {
			// 	if (options.masks.active != "273.0") {
			// 		for (var i in data.map) {
			// 			if (data.map[i].mask == "273.0") {
			// 				delete data.map[i];
			// 			}
			// 		}
			// 	}
			// }

			// Sort so we keep the chain map order the same
			Object.sort(data.map, "id");

			$.extend(data, this.nodes(data.map)); // 250ms -> <100ms
			$.extend(this.data, data);
			this.map.draw(this.newView(data.map), this.options); // 150ms

			if (options.chain.tabs[options.chain.active]) {
				for (var x in options.chain.tabs[options.chain.active].collapsed) {
					var node = $("#chainMap [data-nodeid='"+options.chain.tabs[options.chain.active].collapsed[x]+"']").attr("id");

					if (node) {
						node = node.split("node")[1];
						this.map.collapse(node - 1, true);
					}
				}
			}

			this.lines(data); // 300ms
			this.grid(); // 4ms

			// Apply current system style
			$("#chainMap [data-nodeid='"+viewingSystemID+"']").parent().addClass("currentNode"); // 0.1ms

			// Remove old system effect tooltips and add current ones
			if (WormholeTypeToolTips.attachedElements && WormholeTypeToolTips.attachedElements.length > 0) {
				WormholeTypeToolTips.detach($("#chainMap .whEffect"));
			}
			WormholeTypeToolTips.attach($("#chainMap .whEffect[data-icon]")); // 0.30ms
			WormholeRouteToolTips.attach($("#chainMap .path span[data-tooltip]"));

			this.drawing = false;
		}

		// Gather latest system activity
		if (!this.data.activity || new Date() > this.data.activity.expires) {
			data.activity = {};
			tripwire.esi.universeJumps()
				.done(function(results, status, request) {
					data.activity.expires = new Date(request.getResponseHeader("expires"));
					$.each(results, function(x) {
						data.activity[results[x].system_id] = {
							systemID: results[x].system_id,
							shipJumps: results[x].ship_jumps
						}
					});
				})
				.then(function() {
					 return tripwire.esi.universeKills()
						.done(function(results) {
							$.each(results, function(x) {
								if (data.activity[results[x].system_id]) {
									data.activity[results[x].system_id].podKills = results[x].pod_kills;
									data.activity[results[x].system_id].shipKills = results[x].ship_kills;
									data.activity[results[x].system_id].npcKills = results[x].npc_kills;
								} else {
									data.activity[results[x].system_id] = {
										systemID: results[x].system_id,
										podKills: results[x].pod_kills,
										shipKills: results[x].ship_kills,
										npcKills: results[x].npc_kills,
									}
								}
							});
						});
				})
				.then(function() {
					chain.data.activity = chain.activity(data.activity);
				});
		} else if (data.map) {
			chain.activity(this.data.activity);
		}

		if (data.occupied) { // 3ms
			this.data.occupied = this.occupied(data.occupied);
		}

		if (data.flares) { // 20ms
			this.data.flares = this.flares(data.flares);
		}
	}

	this.collapse = function(c) {
		if (chain.drawing) return false;

		if (options.chain.tabs[options.chain.active]) {
			var collapsed = chain.map.getCollapsedNodes();
			options.chain.tabs[options.chain.active].collapsed = [];
			for (x in collapsed) {
				var systemID = $("#chainMap #node"+(collapsed[x] +1)).data("nodeid");
				options.chain.tabs[options.chain.active].collapsed.push(systemID);
			}
		}

		chain.lines(chain.data);

		// Apply current system style
		$("#chainMap [data-nodeid='"+viewingSystemID+"']").parent().addClass("currentNode");

		if (WormholeTypeToolTips.attachedElements && WormholeTypeToolTips.attachedElements.length > 0) {
			WormholeTypeToolTips.detach($("#chainMap .whEffect"));
		}
		WormholeTypeToolTips.attach($("#chainMap .whEffect[data-icon]"));

		chain.activity(chain.data.activity);

		chain.occupied(chain.data.occupied);

		chain.flares(chain.data.flares);

		chain.grid();

		options.save();
	}

	this.init = function() {
		chain.map = new google.visualization.OrgChart(document.getElementById("chainMap"));
		chain.options = {allowHtml: true, allowCollapse: true, size: "medium", nodeClass: "node"};

		google.visualization.events.addListener(chain.map, "collapse", chain.collapse);

		chain.map.draw(new google.visualization.DataView(new google.visualization.DataTable({cols:[{label: "System", type: "string"}, {label: "Parent", type: "string"}]})), this.options);
	}

	google.charts.setOnLoadCallback(this.init);
}
