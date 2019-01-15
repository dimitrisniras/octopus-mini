var mainApp = angular.module("mainApp", []);

mainApp.controller('tableController', function($rootScope, $scope, $q, $http) {
	const ct = this;
				
	var exampleDatasets = [
		{
			name: 'log4j-1.2.17-Class',
			url: 'http://83.212.106.178:7000/api/v1/log4j-1.2.17-Class'
		},
		{
			name: 'Poker Train',
			url: 'http://83.212.106.178:7000/api/v1/poker_train'
		},
		{
			name: 'Weather',
			url: 'http://83.212.106.178:7000/api/v1/weather'
		}
	];

	var example = [
		{
			'Rendering engine': 'Trident',
			'Browser': 'Internet Explorer 4.0',
			'Platform(s)': 'Win 95+'
		},
		{
			'Rendering engine': 'Trident 2',
			'Browser': 'Internet Explorer 5.0',
			'Platform(s)': 'Win 95+'
		},
		{
			'Rendering engine': 'Another',
			'Browser': 'Mozilla',
			'Platform(s)': 'Win 10'
		},
		{
			'Rendering engine': 'Another another',
			'Browser': 'IE',
			'Platform(s)': 'Win 10'
		}
	];
	var vegaTable = [];
				
	try {
		ct.exampleDatasets = JSON.parse(sessionStorage['exampleDatasets']);
	} catch {
		ct.exampleDatasets = exampleDatasets;
	}
	
	try {
		ct.decodedUri = JSON.parse(sessionStorage['decodedUri']);
	} catch {
		if (window.location.search !== "") {
			let vars = window.location.href.replace(window.location.origin + '/?', '');
			ct.decodedUri = JSON.parse(decodeURIComponent(vars));
		} else {
			ct.decodedUri = [];
		}
	}
				
	ct.buttons = [];
	ct.tables = [];
	ct.decodedUri.forEach((comp) => {
		if (comp[0] == 'table') ct.tables.push(comp[1]);
		if (comp[0] == 'button') ct.buttons.push(comp[1]);
	});
	
	try {
		ct.dataset = JSON.parse(sessionStorage['dataset']);
	} catch(err) {
		ct.dataset = example;
	}

	ct.isLoading = true;
	var cols = [];
	var cells = [];
	for (let i = 0; i < Object.keys(ct.dataset[0]).length; i++) { cells.push(null); cols.push(''); }
		        
	ct.loadData = function(cells, cols) {
		'use strict';

		var EditableTable = {

			options: {
				addButton: '#addToTable',
				table: '#datatable-editable',
				dialog: {
					wrapper: '#dialog',
					cancelButton: '#dialogCancel',
					confirmButton: '#dialogConfirm',
				}
			},

			initialize: function() {
				this
					.setVars()
					.build()
					.events();
			},

			setVars: function() {
				this.$table				= $( this.options.table );
				this.$addButton			= $( this.options.addButton );
				// dialog
				this.dialog				= {};
				this.dialog.$wrapper	= $( this.options.dialog.wrapper );
				this.dialog.$cancel		= $( this.options.dialog.cancelButton );
				this.dialog.$confirm	= $( this.options.dialog.confirmButton );
				return this;
			},

			build: function() {
				this.datatable = this.$table.DataTable({
					aoColumns: cells.concat({ bSortable: false })
				});
				window.dt = this.datatable;
				return this;
			},

			events: function() {
				var _self = this;
				
				this.$table
					.on('click', 'a.save-row', function( e ) {
						e.preventDefault();
						_self.rowSave( $(this).closest( 'tr' ) );
					})
					.on('click', 'a.cancel-row', function( e ) {
						e.preventDefault();
						_self.rowCancel( $(this).closest( 'tr' ) );
					})
					.on('click', 'a.edit-row', function( e ) {
						e.preventDefault();
						_self.rowEdit( $(this).closest( 'tr' ) );
					})
					.on( 'click', 'a.remove-row', function( e ) {
						e.preventDefault();
						var $row = $(this).closest( 'tr' );
						$.magnificPopup.open({
							items: {
								src: '#dialog',
								type: 'inline'
							},
							preloader: false,
							modal: true,
							callbacks: {
								change: function() {
									_self.dialog.$confirm.on( 'click', function( e ) {
										e.preventDefault();
										_self.rowRemove( $row );
										$.magnificPopup.close();
									});
								},
								close: function() {
									_self.dialog.$confirm.off( 'click' );
								}
							}
						});
					});

				this.$addButton.on( 'click', function(e) {
					e.preventDefault();
					_self.rowAdd();
				});

				this.dialog.$cancel.on( 'click', function( e ) {
					e.preventDefault();
					$.magnificPopup.close();
				});

				return this;
			},

			// ==========================================================================================
			// ROW FUNCTIONS
			// ==========================================================================================
			rowAdd: function() {
				this.$addButton.attr({ 'disabled': 'disabled' });
				var actions,
					data,
					$row;
				actions = [
					'<a href="#" class="hidden on-editing save-row"><i class="fa fa-save"></i></a>',
					'<a href="#" class="hidden on-editing cancel-row"><i class="fa fa-times"></i></a>',
					'<a href="#" class="on-default edit-row"><i class="fa fa-pencil"></i></a>',
					'<a href="#" class="on-default remove-row"><i class="fa fa-trash-o"></i></a>'
				].join(' ');
				data = this.datatable.row.add(cols.concat([actions]));
				$row = this.datatable.row( data[0] ).nodes().to$();
				$row
					.addClass( 'adding' )
					.find( 'td:last' )
					.addClass( 'actions' );
				this.rowEdit( $row );
				this.datatable.order([0,'asc']).draw(); // always show fields
			},
			rowCancel: function( $row ) {
				var _self = this,
					$actions,
					i,
					data;
				if ( $row.hasClass('adding') ) {
					this.rowRemove( $row );
				} else {
					data = this.datatable.row( $row.get(0) ).data();
					this.datatable.row( $row.get(0) ).data( data );
					$actions = $row.find('td.actions');
					if ( $actions.get(0) ) {
						this.rowSetActionsDefault( $row );
					}
					this.datatable.draw();
				}
			},

			rowEdit: function( $row ) {
				var _self = this,
					data;
				data = this.datatable.row( $row.get(0) ).data();
				$row.children( 'td' ).each(function( i ) {
					var $this = $( this );
					if ( $this.hasClass('actions') ) {
						_self.rowSetActionsEditing( $row );
					} else {
						$this.html( '<input type="text" class="form-control input-block" value="' + data[i] + '"/>' );
					}
				});
			},
			rowSave: function( $row ) {
				var _self     = this,
					$actions,
					values    = [];
				if ( $row.hasClass( 'adding' ) ) {
					this.$addButton.removeAttr( 'disabled' );
					$row.removeClass( 'adding' );
				}
				values = $row.find('td').map(function() {
					var $this = $(this);
					if ( $this.hasClass('actions') ) {
						_self.rowSetActionsDefault( $row );
						return _self.datatable.cell( this ).data();
					} else {
						return $.trim( $this.find('input').val() );
					}
				});
				this.datatable.row( $row.get(0) ).data( values );
				$actions = $row.find('td.actions');
				if ( $actions.get(0) ) {
					this.rowSetActionsDefault( $row );
				}
				this.datatable.draw();
			},

			rowRemove: function( $row ) {
				if ( $row.hasClass('adding') ) {
					this.$addButton.removeAttr( 'disabled' );
				}
				this.datatable.row( $row.get(0) ).remove().draw();
			},
			rowSetActionsEditing: function( $row ) {
				$row.find( '.on-editing' ).removeClass( 'hidden' );
				$row.find( '.on-default' ).addClass( 'hidden' );
			},
			rowSetActionsDefault: function( $row ) {
				$row.find( '.on-editing' ).addClass( 'hidden' );
				$row.find( '.on-default' ).removeClass( 'hidden' );
			}

		};

		$(function() {
			EditableTable.initialize();
		});
	}

	ct.loadData(cells, cols);
	ct.isLoading = false;

	ct.datasets = function(url) {
		console.log(url);
		var settings = {
		  "async": true,
		  "crossDomain": true,
		  "url": url,
		  "method": "GET"
		}
					
		var data = [];
					
		$.ajax(settings).done(function (response) {
		  var pages;
		  if (response._links.last != undefined) {
		  	pages = parseInt(response._links.last.href.slice(-2));
		  } else {
		  	pages = 1;
		  }
		  
		  var promiseArray = [];
		  
		  
		  for (var i = 1; i <= pages; i++) {
		  	var settings = {
			  "async": true,
			  "crossDomain": true,
			  "url": url + "?page=" + i,
			  "method": "GET"
			}
			
		  	promiseArray.push($.ajax(settings).done(function (response) {
		  		response._items.forEach((item) => {
		  			delete item['_updated'];
		  			delete item['_links'];
		  			delete item['_created'];
		  			delete item['_id'];
		  			delete item['_etag'];
		  			data.push(item);
		  		});
		  	}));
		  }
		  
		  $q.all(promiseArray).then(function() {
		  	
			sessionStorage['dataset'] = JSON.stringify(data.slice(0,50));
			sessionStorage['decodedUri'] = JSON.stringify(ct.decodedUri);
			sessionStorage['exampleDatasets'] = JSON.stringify(ct.exampleDatasets);
			window.location = window.location.href.split("?")[0];
		  	
		  });
		  
		});
	};
				
	ct.addNewDataset = function() {
		var name = $('#addDataName').val();
		var url = $('#addDataUrl').val();
		
		if (name == '' || url == '') {
			alert('Fill all the information!');
		} else {
			ct.exampleDatasets.push({'name': name, 'url': url});
			$('#addDataName').val('');
			$('#addDataUrl').val('');
		}
	};
				
	ct.refreshPage = function() {
		sessionStorage['dataset'] = JSON.stringify(example);
		sessionStorage['decodedUri'] = JSON.stringify(ct.decodedUri);
		sessionStorage['exampleDatasets'] = JSON.stringify(ct.exampleDatasets);
		window.location = window.location.href.split("?")[0];
	};
				
	ct.changeAppearence = function(type, element, comp) {
		if (comp !== undefined) {
			var newClass = comp.split('_').join(' ');
			if (type == 'button') $(element).attr('class', 'btn ' + newClass);
			if (type == 'table') $(element).attr('class', 'table ' + newClass);
		}
	};
				
	ct.getDatasetInstance = function() {
		var data = [];
		var headers = Object.keys(ct.dataset[0]);
		headers.splice(headers.indexOf('$$hashKey'),1);
		$('#datatable-editable').DataTable().rows().data().each((row) => {
			var result = {};
			headers.forEach((key, i) => result[key] = row[i]);
			data.push(result);
		});
		var downloableData = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
		$('#getDataBtn').attr('href', downloableData);
		$('#getDataBtn').attr('download', 'data.json');
		$('#getDataBtn').click();
	};

	ct.copyCode = function() {
			var $temp = $("<input>");
			$("body").append($temp);
			$temp.val($('html').html()).select();
			document.execCommand("copy");
			/*var html = $('html').clone();
			html.find('#select1').remove();
			html.find('#select2').remove();
			html.find('#select3').remove();
			html.find('#copyCodeBtn').remove();
			console.log(html.html());*/
	};
				
	ct.addToVega = function(column) {
		if (vegaTable.includes(column)) {
			vegaTable.splice(vegaTable.indexOf(column), 1);
		} else {
			vegaTable.push(column);
		}
	};
				
	ct.showGraph = function(graph) {
		var view;
		
		function render(spec) {
		  view = new vega.View(vega.parse(spec))
			.renderer('canvas')  // set renderer (canvas or svg)
			.initialize('#view') // initialize view within parent DOM container
			.hover()             // enable hover encode set processing
			.run();
		}
		
		if (graph == undefined) {
			alert('Please select a graph');
		} else if (vegaTable.length == 0) {
			alert('Please select one or more columns');
		} else {
			let vegaData = {
				"data": {}
			};
			
			vegaTable.forEach((col) => {
				vegaData.data[col] = [];
				
				ct.dataset.forEach((data) => {
					vegaData.data[col].push(data[col]);
				});
			});
			
			if ((graph == 'barChart' || graph == 'areaChart' || graph == 'histogramChart') && vegaTable.length > 1) {
				alert('Please select only one column!');
				return;
			}
			
			if (graph == 'contourPlotChart' && vegaTable.length != 2) {
				alert('Please select exactly two columns');
				return;
			}
			
			if (graph == 'scatterPlotChart' && vegaTable.length < 2) {
				alert('Please select at least 2 columns');
				return;
			}
			
			$http({
				method: 'POST',
				url: 'http://localhost:9000/api/data/' + graph,
				data: vegaData
			}).then(function success(res) {
				render(res.data);
			}, function error(res) {
				console.log(res);
			});
		}
		
	};
						
});
