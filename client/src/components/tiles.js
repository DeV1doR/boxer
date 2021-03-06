define([
    'app',
    'jquery',
    'backbone',
    'easel'
], function(app, $, Backbone) {

    var TileMap = function(args) {
        this.init(args);
    };

    TileMap.prototype = {

        /**
         * Init function
         * @param  {object} mapData  Tileset data from json
         * @return {undefined}
         */
        init: function(mapData) {
            this.mapData = mapData;
            this.imageId = mapData.tilesets[0].image.split('/').pop().split('.')[0];
            this.tileset = app.baseImages[this.imageId];
            this._container = new createjs.Container();
        },

        /**
         * loading layers from tileset map
         * @return {undefined}
         */
        initLayers: function() {
            var w = this.mapData.tilesets[0].tilewidth;
            var h = this.mapData.tilesets[0].tileheight;
            var imageData = {
                images : [
                    this.tileset.image
                ],
                frames : {
                    width : w,
                    height : h
                }
            };
            // create spritesheet
            var tilesetSheet = new createjs.SpriteSheet(imageData);
            // loading each layer at a time
            for (var idx = 0; idx < this.mapData.layers.length; idx++) {
                var layerData = this.mapData.layers[idx];
                if (layerData.type == 'tilelayer')
                    this.initLayer(layerData, tilesetSheet);
            }
            this._container.cache(0, 0, app.config.BOARD.width, app.config.BOARD.height);
            app.stage.addChildAt(this._container, 0);
        },

        /**
         * layer initialization
         * @param  {object} layerData    Layer picture data
         * @param  {object} tilesetSheet createjs.SpriteSheet of parsed sprite
         * @return {undefined}
         */
        initLayer: function(layerData, tilesetSheet) {
            var coords, isoX, isoY;
            for (var y = 0; y < layerData.height; y++) {
                for ( var x = 0; x < layerData.width; x++) {
                    // create a new Bitmap for each cell
                    var cellBitmap = new createjs.Sprite(tilesetSheet);
                    // layer data has single dimension array
                    var idx = x + y * layerData.width;
                    // tilemap data uses 1 as first value, EaselJS uses 0 (sub 1 to load correct tile)
                    cellBitmap.gotoAndStop(layerData.data[idx] - 1);
                    // isometrix tile positioning based on X Y order from Tiled
                    coords = this._getIsoCoord(x, y);
                    isoX = coords.isoX;
                    isoY = coords.isoY;
                    cellBitmap.x = (this.mapData.tilewidth / 2) * isoX + app.config.BOARD.width / 2;
                    cellBitmap.y = (this.mapData.tileheight) * isoY;
                    // add bitmap to stage
                    this._container.addChild(cellBitmap);
                }
            }
        },

        _getIsoCoord: function(x, y) {
            return {
                isoX: x - y,
                isoY: (x + y) / 2
            };
        },

        _getCartesianCoord: function(x, y) {
            return {
                x: (2 * y + x) / 2,
                y: (2 * y - x) / 2
            };
        }
    };
    TileMap.prototype.constructor = TileMap;

    return {
        TileMap: TileMap
    };

});