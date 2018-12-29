(function ($) {

    $(document).ready(function() {

       catalogue.init();
    });

    var catalogue = {

    	init: function() {

            var me = this;
            
            // Elements
            this.$modelsContainer = $('#modelsContainer');
            this.$matrix = $('#catalogueProductsMatrix');
            this.$matrix2 = $('#catalogueProductsMatrix2');
            this.$warnings = $('#warnings');
            this.$makesAndModels = $('#makesAndModels');

            // Variables/properties
            this.manufacturerIndex = 0;
            this.makeSelected = null;
            this.modelSelected = null;
            this.modelClicked = 0;
            this.squareSize = 145;
            this.animationSpeed = 500;
            
            // URLs
            this.travallURL = "http://travall.com"
            this.catalogueURL = "sites/default/files/catalogue/"
            this.badgeURL = "sites/default/files/catalogue/car-badges/";
            this.placeHolderVehicleURL = "/sites/default/files/0000-";
            
            // AJAX
    		$.ajax({
        		type: "GET",
        		url: "json/products.json",
        		dataType: "json",
        		success: function(data) {
                    // Format data
                    me.displayManufacturers(data);
                    me.handleOrientationChange();
	        	}
    		});
    	},

    	displayManufacturers: function(data) {
            var manufacturers = [];
            // Create manufacturers key array
            for (var manufacturer in data) manufacturers.push(manufacturer);
            // Append makes to container
            for (var make in manufacturers) {
                var imgRef = manufacturers[make];
                // Remove dashes and special characters
                imgRef = imgRef.replace(/\s+/g, '-');
                imgRef = imgRef.replace(/ë/g, 'e');
                this.$makesAndModels.append('<div class="make"><img data-original="'+this.badgeURL+imgRef+'.jpg" alt="'+manufacturers[make]+'" class="lazy" src="'+this.catalogueURL+'misc/ajax-loader.gif" width="140" height="140"><span class="caption">' + manufacturers[make] + '</span></div>');
            };
            $(".make img.lazy").lazyload({
                event: "lazyload",
                effect: "fadeIn",
                effectspeed: 500,
                skip_invisible: false,
                load: function () {
                    $(this).removeClass('lazy');
                }
            }).trigger("lazyload");
            
            this.$makesAndModels.css('height', Math.ceil(($('.make').length/6))*this.squareSize);
            this.$makesAndModels.css('marginBottom', '200px');

            this.getNumberOfColumns();
            this.setUpMakes(data, manufacturers);
    	},

        handleOrientationChange: function() {
            var me = this;
            // Listen for orientation changes
            $(window).resize($.throttle(250, function() {
                if ($('.model').length) {
                    var elemIndex = $('.make.selected').attr('make-index');
                    var insertPosition = me.getInsertPosition(+elemIndex);
                    me.$modelsContainer.insertAfter($('.make:eq('+insertPosition+')'));
                    $('.empty').remove();
                    me.drawEmptySquares($('.model'), 'checker empty fader large-2 medium-4 small-6', me.$modelsContainer);

                }

                if ($('.variant').length) {
                    var elemIndex = $('.model.selected').attr('model-index');
                    var insertPosition = me.getInsertPosition(+elemIndex);
                    me.$matrix.insertAfter($('.model:eq('+insertPosition+')'));
                    $('.empty').remove();
                    me.drawEmptySquares($('.model'), 'checker empty fader large-2 medium-4 small-6', me.$modelsContainer);
                }
            })); 
        },

        getNumberOfColumns: function() {
            return this.$makesAndModels.outerWidth()/this.squareSize;

        },

    	setUpMakes: function(data, manufacturers) {
    		var me = this;
            $('.make').each(function() {
                $(this).attr("make-index", $(this).index());
            });
            this.drawEmptySquares($('.make'), 'make', this.$makesAndModels);
    		this.$makesAndModels.on('click', '.make', function(e) {
                var thisIndex = $(this).attr("make-index");
                var thisElem = $('.make:eq('+thisIndex+')');
                $('.make').removeClass('selected');
                thisElem.addClass('selected');
                if (thisElem.is(me.makeSelected) && me.modelClicked == 0) { 
                    me.makeSelected = null;
                    me.animateOpacity($(this), $('.make'), 0.2, 500);
                    me.closeModels();
                } else {
                    me.makeSelected = thisElem;
                    me.animateOpacity($(this), $('.make'), 0.2, 500);
                    me.animateOpacity(null, me.makeSelected, 1, 500);
                    me.toggleModelContainer(data, manufacturers, $(this));
                }
                e.stopImmediatePropagation();
			});
    	},

        toggleModelContainer: function(data, manufacturers, elem) {
            var me = this;
            this.$modelsContainer.hide();
            var pos = elem.offset();
            $('html, body').delay(500).animate({scrollTop: pos.top});
            me.formatModels(data, manufacturers, elem);
        },

        closeModels: function () {
            this.clearWarnings();
            this.clearMatrix();
            this.animateOpacity(null, $('.make'), 1, 500);
            this.$modelsContainer.slideUp(400);
        },

        formatModels: function(data, manufacturers, elem) {
            
            var elemIndex = elem.attr('make-index');
            
            this.clearWarnings();
            this.clearMatrix();
            this.clearModels();
            
            this.manufacturerIndex = +elemIndex;

            var theModelsArray = data[manufacturers[this.manufacturerIndex]].model;
            
            // Check for empty products arrays in variants (and hide the associated model if no products across all)
            var theVariantsArray = [];
            for (var j in theModelsArray) {
                theVariantsArray.push(data[manufacturers[this.manufacturerIndex]].model[j].variants)
            }
            var missingArray = [];
            
            // Find the variants which have no products
            for (var i in theVariantsArray) {
                var missing = 0;
                for (var k in theVariantsArray[i]) {
                    if (theVariantsArray[i][k].products.length==0) missing++;
                }
                missingArray.push(missing);
            }
            
            // Check total missing values against total variants and if they match remove the model from the array. A reverse loop is used so array positions aren't lost
            for (var x = theModelsArray.length-1; x >= 0; x--) {
                var totalVariants = data[manufacturers[this.manufacturerIndex]].model[x].variants.length;
                if (missingArray[x] == totalVariants) {
                    theModelsArray.splice(x, 1);
                }
            }
            
            // Work out where to insert container
            var insertPosition = this.getInsertPosition(+elemIndex);
            this.$modelsContainer.insertAfter($('.make:eq('+insertPosition+')'));
            
            // Display the models
            for (var model = 0; model < theModelsArray.length; model++) {
                var theModel = data[manufacturers[this.manufacturerIndex]].model[model].name;
                var theModelClass = theModel.substring(0, 3).toLowerCase();
                this.$modelsContainer.append($('<div class="checker model fader large-2 medium-4 small-6 '+theModelClass+'" data-model="'+theModel+'"><span class="caption">'+theModel+'</span></div>'));
            }
            this.drawEmptySquares($('.model'), 'checker empty fader large-2 medium-4 small-6', this.$modelsContainer);

            // Show the models
            this.showModels(data, manufacturers);
        },

        getInsertPosition: function(elemIndex) {
            
            // add 1 to 0 indexing because ceiling of 0/6 = 0
            var elInd = elemIndex+1;
            var columns = this.getNumberOfColumns();
            var insertPosition = Math.ceil(elInd/columns);
            insertPosition = insertPosition*columns;
            // Take away the 1 to give an index
            insertPosition = insertPosition-1;
            return insertPosition;
        },

        drawEmptySquares: function(elem, classes, container) {
            var me = this;
            // Work out empty squares
            var totalElem = elem.length;
            var columns = this.getNumberOfColumns();
            var totalBoxes = Math.ceil(totalElem/columns);
            totalBoxes = totalBoxes*columns;
            var emptySquares = (totalElem - totalBoxes)*-1;
            for (var squares = 0; squares < emptySquares; squares++) {
                container.append($('<div class="'+classes+'">&nbsp;</div>'));
            }
            this.checkerSquares();
        },

        checkerSquares: function() {
            var me = this;
            // Checker the squares
            var x=1;
            var columns = this.getNumberOfColumns();
            $('.checker').each(function() {
                $(this).removeClass('alternate');
                if (columns === 3) {
                    if (x % 2 == 0) $(this).addClass('alternate');
                } else {
                    var isEvenRow = Math.ceil(x / columns) % 2 == 0;
                    var isCellAlternate = x % 2 == isEvenRow ? 0 : 1;
                    if (isCellAlternate) $(this).addClass('alternate');
                }
                x++;
            });
        },

        showModels: function(data, manufacturers) {
            var me = this;
            this.$modelsContainer.delay(300).stop(true, false).slideDown(400, function() {
                $('.model').each(function() {
                    $(this).attr("model-index", $(this).index());
                });     
                $(this).on('click ', '.model', function(e) {
                    var thisIndex = $(this).attr("model-index");
                    var thisElem = $(this);
                    $('.model').removeClass('selected');
                    thisElem.addClass('selected');
                    if (thisElem.is(me.modelSelected)) {
                        me.modelSelected = null;
                        me.clearWarnings();
                        me.clearMatrix();
                        me.animateOpacity(null, $('.model.fader'), 1, 500);
                        me.animateOpacity(null, $('.empty.fader'), 0.2, 500);
                    } else {
                        me.modelSelected = thisElem;
                        me.animateOpacity(this, $('.model.fader'), 0.2, 500);
                        me.animateOpacity(this, $('.empty.fader'), 0.1, 500);
                        me.animateOpacity(null, $('.model.fader:eq('+thisIndex+')'), 1, 500);
                        me.clearWarnings();
                        me.$matrix.fadeOut(function() {
                            $('#catalogueProductsMatrix' + ' tr[class^="variantRow"]').remove();
                            me.populateProducts(data, manufacturers, me.manufacturerIndex, thisElem, thisIndex);
                        });
                    }
                    e.stopImmediatePropagation();
                    $(this).unbind('click');
                });
            });
        },

    	populateProducts: function (data, manufacturers, index, elem, elemIndex) {
            var elemIndex = +elemIndex;
            var model = data[manufacturers[index]].model[elemIndex];
            this.$matrix.appendTo(this.$modelsContainer);
            var variantsArray = data[manufacturers[index]].model[elemIndex].variants;
            for (var variantNumber in variantsArray) {
                // Car description and mark
                var carDescription = model.variants[variantNumber].car_description;
                var mark = model.variants[variantNumber].mark;
                mark == null ? mark = '' : mark = '<small>['+model.variants[variantNumber].mark+']</small>';
                // Year range
                var yearStart = model.variants[variantNumber].date_start;
                var yearEnd = model.variants[variantNumber].date_end;
                var yearRange;
                yearEnd == null ? yearRange = '('+yearStart+' ->)' : yearRange = '('+yearStart+'-'+yearEnd+')';
                // Set the variant image
                var variantImg = model.variants[variantNumber].image;
                if (variantImg == null) {
                    var bodyStylePlaceHolder = model.variants[variantNumber].body_style;
                    bodyStylePlaceHolder = bodyStylePlaceHolder.replace(/\s+/g, '-');
                    bodyStylePlaceHolder = bodyStylePlaceHolder.replace(/é/g, 'e');
                    bodyStylePlaceHolder = bodyStylePlaceHolder.toLowerCase();
                    variantImg = this.placeHolderVehicleURL+bodyStylePlaceHolder+".png";
                }
                var skuGroup = data[manufacturers[index]].model[elemIndex].variants[variantNumber].products;
                
                // Only append row if there are products
                if (skuGroup.length != 0) {
                    // Table
                    this.$matrix.append('<tr class="variantRow'+variantNumber+'"><td class="large-2 variant"></td><td class="large-2 tdg-skus"></td><td class="large-2 tdgd-skus"></td><td class="large-2 tbp-skus"></td><td class="large-2 tbm-skus"></td><td class="large-2 trml-skus trmr-skus trm-skus"></td></tr>');
                    $('#catalogueProductsMatrix .variantRow'+variantNumber+' .variant').append('<img class="lazy" src="'+this.catalogueURL+'misc/ajax-loader.gif" data-original="'+this.travallURL+variantImg+'" alt="Vehicle image"><br>'+carDescription+' '+mark+'<br>'+yearRange+'');
                }
                // Get the skus
                if (skuGroup["TDG"]) this.getSkus(data, manufacturers, index, elemIndex, variantNumber, "TDG");
                if (skuGroup["TDGD"]) this.getSkus(data, manufacturers, index, elemIndex, variantNumber, "TDGD");
                if (skuGroup["TBP"]) this.getSkus(data, manufacturers, index, elemIndex, variantNumber, "TBP");
                if (skuGroup["TBM"]) this.getSkus(data, manufacturers, index, elemIndex, variantNumber, "TBM");
                if (skuGroup["TRM-R"]) this.getSkus(data, manufacturers, index, elemIndex, variantNumber, "TRM-R");
                if (skuGroup["TRM"]) this.getSkus(data, manufacturers, index, elemIndex, variantNumber, "TRM");
                if (skuGroup["TRM-L"]) this.getSkus(data, manufacturers, index, elemIndex, variantNumber, "TRM-L");
            }
            $(".variant img.lazy").lazyload({
                event: "lazyload",
                effect: "fadeIn",
                effectspeed: 500,
                skip_invisible: false,
                load: function () {
                    $(this).removeClass('lazy');
                }
            }).trigger("lazyload");
            this.showMatrix(elem, elemIndex);
        },

        showMatrix: function(elem, elemIndex) {
            var me = this;
            // Work out where to insert
            var insertPosition = this.getInsertPosition(elemIndex);
            this.$matrix.insertAfter($('.model:eq('+insertPosition+')'));
            this.$matrix.fadeIn('fast', function() {
                var pos = elem.offset();
                $('html, body').delay(500).animate({scrollTop: pos.top});
                
            });
            this.setUpWarnings();
        },

        getSkus: function (data, manufacturers, index, elemIndex, variantNumber, skuGroup) {
            var skusArray = [];
            skusArray = data[manufacturers[index]].model[elemIndex].variants[variantNumber].products[skuGroup].sku;
            var skuClass;
            skuClass = skuGroup.replace(/-/g, "");
            skuClass = skuClass.substring(0, 4).toLowerCase();

            if (skusArray.length != 0) {
                for (var i in skusArray) {
                    var warningsCount = skusArray[i].warnings_count;
                    if (warningsCount > 0) {
                        var warningButtonClass = variantNumber+skuClass+i;
                        var warningButton = '<span class="warningButton '+warningButtonClass+'"><img src="sites/default/files/catalogue/products/info-mark.png"></span>';
                        this.getWarnings(skusArray[i], warningsCount, warningButtonClass);
                    } else {
                        var warningButton = "";
                    }
                    // Table
                    $('#catalogueProductsMatrix .variantRow'+variantNumber+' .'+skuClass+'-skus').append('<div class="sku '+skuClass+(variantNumber+1)+(i+1)+'">' + skusArray[i].item + ' ' + warningButton + '</div>');   
                    
                    // Div
                    //$('#variantsContainer .variantRow'+variantNumber+' .'+skuClass+'-skus').append('<div class="sku '+skuClass+(variantNumber+1)+(i+1)+'">' + skusArray[i].item + ' ' + warningButton + '</div>');
                }
            } 
        },

        getWarnings: function(sku, warningsCount, warningButtonClass) {
            for (var j=0; j<warningsCount; j++) {
                this.$warnings.append('<div class="warning-catalogue '+warningButtonClass+'">' + sku.warnings_text[j] + '<span id="close">X</span></div>');
            }
        },

        setUpWarnings: function() {
            var me = this;
            var warningButtonSelected;
            $('.warningButton').on('click', function(e) {
                var pos = $(this).offset();
                $(this).addClass('inactive');
                me.$warnings.css('top', pos.top-50+'px');
                $('#warnings div').hide();
                var warningClass = $(this).attr('class').split(' ')[1];
                $('#warnings'+' .'+warningClass).show();
                me.$warnings.delay(100).fadeIn(200);
                $('#popoutBG').fadeIn(200);
                me.warningButtonSelected = $(this);
                e.stopImmediatePropagation();
            });
            this.$warnings.on('click', '#close', function(e) {
                me.warningButtonSelected.removeClass('inactive');
                me.$warnings.fadeOut('fast');
                $('#popoutBG').fadeOut();
                e.stopImmediatePropagation();
            });
        },

        clearMatrix: function() {
            this.$matrix.hide();
            $('#catalogueProductsMatrix' + ' tr[class^="variantRow"]').remove();
        },

        clearWarnings: function() {
            this.$warnings.hide();
            this.$warnings.empty();
        },

        clearModels: function() {
            this.$modelsContainer.hide();
            this.$modelsContainer.empty();
        },

        animateOpacity: function (notElem, elem, opacity, time) {
            elem.not(notElem).animate({
                "opacity": opacity,
            }, time, "linear");
                
        }
	}
})(jQuery);