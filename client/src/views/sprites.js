require(['app', 'utils', 'backbone', 'underscore', 'easel', 'tween'], function(app, utils, Backbone, _) {

    var _stars, _hpColor,
        size = 10;

    app.SpriteView = Backbone.View.extend({

        initialize: function() {
            this.elements = [];
            this.changeSprite();
            this.initUsername();
            this.initHP();
            this.initAlpha();
            this.model.on("change", this.render, this);
            this.on("player_hit", this.updateDmgDisplay, this);
        },
        render: function() {
            this.model.currentSprite.x = this.model.x;
            this.model.currentSprite.y = this.model.y;

            utils._LOG('Sprite coords: ' +
                       'X: ' + this.model.currentSprite.x + '; ' +
                       'Y: ' + this.model.currentSprite.y + ';');

            if (this.model.prevArmor != this.model.armor) {
                this.changeSprite();
            }
            if (this.model.currentSprite.currentAnimation != this.model.animation.key) {
                this.animate();
            }
            this.updateUsername();
            this.updateHP();
            this.updateTransparency();
            return this;
        },
        animate: function() {
            utils._LOG('Start playing animation: ' + this.model.animation.key);
            if (this.model.isDead()) {
                this.model.currentSprite.gotoAndStop(this.model.animation.key);
                this.model.currentSprite._animation.next = false;
                // TODO: Fix updateAt
                if (Math.floor(Date.now() / 1000) - this.model.updatedAt > 2) {
                    this.model.currentSprite._animation.frames.splice(0, this.model.currentSprite._animation.frames.length - 1);
                }
                this.model.currentSprite.play();
            } else {
                this.model.currentSprite.gotoAndPlay(this.model.animation.key);
            }
        },
        changeSprite: function() {
            if (this.model.currentSprite) {
                app.stage.removeChild(this.model.currentSprite);
                this.model.currentSprite.removeAllEventListeners();
            }

            this.model.currentSprite = app.baseSprites[this.model.animation.armor].clone();
            this.model.currentSprite.x = this.model.x;
            this.model.currentSprite.y = this.model.y;

            this.model.currentSprite.on('click', function() {
                app.currentCharacter.model.shoot(this.model.id);
            }, this);

            if (!this.model.prevArmor) {
                this.animate();
            }
            this.model.prevArmor = this.model.armor;

            app.stage.addChild(this.model.currentSprite);
        },
        _debugBorder: function() {
            app.stage.removeChild(this.sshape);
            this.sshape = new createjs.Shape().set({
                x: this.model.currentSprite.x,
                y: this.model.currentSprite.y
            });
            this.sshape.graphics.clear();
            this.sshape.graphics.ss(1);
            this.sshape.graphics.beginStroke("#000000");
            this.sshape.graphics.moveTo(0, 0);
            this.sshape.graphics.lineTo(this.model.width, 0);
            this.sshape.graphics.lineTo(this.model.width, this.model.height);
            this.sshape.graphics.lineTo(0, this.model.height);
            this.sshape.graphics.lineTo(0, 0);
            this.sshape.graphics.endFill();
            // this.sshape.graphics.drawRect(0, 0, this.model.width, this.model.height);
            app.stage.addChild(this.sshape);
            this.elements.push(this.sshape);
        },
        renderPivot: function() {
            if (this.pv) {
                app.stage.removeChild(this.pv);
            }
            this.pv = new createjs.Shape().set({
                x: this.model.pivot.x,
                y: this.model.pivot.y
            });
            this.pv.graphics.clear();
            this.pv.graphics.beginFill("red");
            this.pv.graphics.drawCircle(0, 0, 5);
            this.pv.graphics.endFill();
            app.stage.addChild(this.pv);
        },
        initUsername: function() {
            this.textUsername = new createjs.Text();
            this.textUsername.font = size + ' px Russo One';
            this.updateUsername();
            app.stage.addChild(this.textUsername);
            this.elements.push(this.textUsername);
        },
        updateUsername: function() {
            this.textUsername.text = this.model.name;
            this.textUsername.x = this.model.x + 2 * this.model.name.length;
            this.textUsername.y = this.model.y - size;
        },
        initHP: function() {
            this.initHP = new createjs.Text();
            this.initHP.font = size + ' px Russo One';
            this.updateHP();
            app.stage.addChild(this.initHP);
            this.elements.push(this.initHP);
        },
        _detectAlpha: function() {
            var alpha;
            if (this.model.display == app.constants.Display.Hidden) {
                if (this.model == app.currentCharacter.model) {
                    alpha = 0.5;
                } else {
                    alpha = 0;
                }
            } else {
                alpha = 1;
            }
            return alpha;
        },
        initAlpha: function() {
            var alpha = this._detectAlpha();
            for (var i = 0; i < this.elements.length; i++) {
                this.elements[i].alpha = alpha;
            }
            this.model.currentSprite.alpha = alpha;
        },
        updateTransparency: function() {
            if (this.model._prevDisplay != this.model.display) {
                var alpha = this._detectAlpha();
                for (var i = 0; i < this.elements.length; i++) {
                    createjs.Tween.get(this.elements[i]).to({alpha:  alpha}, 500);
                }
                createjs.Tween.get(this.model.currentSprite).to({alpha:  alpha}, 500);
                this.model._prevDisplay = this.model.display;
            }
        },
        updateHP: function() {
            if (this.model.health == this.model.maxHealth) {
                _hpColor = '#156526';
                _stars = ' * '.repeat(4);
            } else if (this.model.maxHealth * 0.66 < this.model.health && this.model.health <= this.model.maxHealth) {
                _hpColor = '#1de592';
                _stars = ' * '.repeat(3);
            } else if (this.model.maxHealth * 0.33 < this.model.health && this.model.health <= this.model.maxHealth * 0.66) {
                _hpColor = '#FF7400';
                _stars = ' * '.repeat(2);
            } else if (0 < this.model.health && this.model.health <= this.model.maxHealth * 0.33) {
                _hpColor = '#990000';
                _stars = ' * '.repeat(1);
            } else {
                _hpColor = '#990000';
                _stars = '-';
            }

            this.initHP.color = _hpColor;

            if (app.currentCharacter && this.model == app.currentCharacter.model) {
                this.initHP.text = this.model.health + '/' + this.model.maxHealth;
                this.initHP.x = this.model.x + size - this.initHP.text.length;
                this.initHP.y = this.model.y - 2 * size;
            } else {
                this.initHP.text = _stars;
                this.initHP.x = this.model.x + size - this.initHP.text.length;
                this.initHP.y = this.model.y - 2 * size;
            }
            if (!this.prevHP || this.prevHP !== this.model.health) {
                var diff = this.model.health - this.prevHP;
                var color = (diff < 0) ? '#990000': '#156526';
                this.prevHP = this.model.health;
                this.trigger('player_hit', diff, color);
            }
        },
        updateDmgDisplay: function(dmg, color) {
            var self = this;
            var _run = function(dmg, color) {
                var size = 20;
                var x = 100;
                var y = 100;
                var textDmg = new createjs.Text();
                textDmg.font = '20 px Russo One';
                textDmg.text = dmg;
                textDmg.color = color;
                textDmg.x = self.model.x;
                textDmg.y = self.model.y;
                textDmg.alpha = 0;
                app.stage.addChild(textDmg);
                createjs.Tween.get(textDmg)
                    .wait(100)
                    .to({y: textDmg.y - size, alpha: 1}, 333)
                    .to({y: textDmg.y - 2 * size, alpha: 0}, 333)
                    .call(function() {
                        app.stage.removeChild(textDmg);
                    });
            }
            _run(dmg, color);
        },
        destroy: function() {
            for (var i = 0; i < this.elements.length; i++) {
                app.stage.removeChild(this.elements[i]);
            }
            this.remove();
            this.unbind();
        }
    });

});