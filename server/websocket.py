# -*- coding: utf-8 -*-
from __future__ import print_function, unicode_literals

import os
import logging
import json
from collections import OrderedDict

import gevent
from gevent import monkey; monkey.patch_all()  # noqa
from gevent.queue import Queue
from geventwebsocket import (
    WebSocketServer, WebSocketApplication, Resource, WebSocketError)

from conf import settings
from utils import setup_logging
from db import local_db
from app.models import CharacterModel, Outlander, Turret
from app.engine import spatial_hash, TiledReader


main_queue = Queue()


class GameApplication(WebSocketApplication):

    @staticmethod
    def _g_cleaner(user):
        # spatial_hash.remove_obj_by_point(user.pivot, user)
        user._clear_greenlets()
        try:
            del local_db['characters'][user.id]
        except KeyError:
            pass

    def broadcast(self, msg_type, data):
        try:
            self.ws.send(json.dumps({'msg_type': msg_type, 'data': data}))
        except WebSocketError as e:
            GameApplication._g_cleaner(self.user)
            logging.error(e)

    def on_open(self):
        local_db.setdefault('characters', set())
        logging.debug("Connection opened")

    def on_message(self, message):
        if message:
            message = json.loads(message)
            logging.info('Evaluate msg %s' % message['msg_type'])
            getattr(self, message['msg_type'])(message.get('data', None))

    def register_user(self, message):
        self.user = Outlander.create(user_id=1, name='hello')
        logging.debug(self.user.id)
        local_db['characters'][self.user.id] = self.user
        self.broadcast('register_user', self.user.to_dict())

    def unregister_user(self, message):
        char_id = self.user.id
        if char_id is not None:
            self._g_cleaner(self.user)
            main_queue.put_nowait(char_id)

    @staticmethod
    def get_character_by_cid(message):
        try:
            cid = message['cid']
            return local_db['characters'][cid]
        except (TypeError, KeyError):
            pass

    def player_move(self, message):
        self.user.move(message['point'])

    def player_stop(self, message):
        self.user.stop()

    def player_shoot(self, message):
        char = self.get_character_by_cid(message)
        self.user.shoot(char)

    def player_equip(self, message):
        self.user.equip(message['equipment'])

    def player_heal(self, message):
        char = self.get_character_by_cid(message)
        self.user.heal(char)

    def player_stealth(self, message):
        self.user.stealth()


def pre_loader():
    local_db.setdefault('characters', {})
    local_db.setdefault('turrets', [
        Turret(),
        Turret(x=local_db['map_size']['width'] / 2 + 50),
        Turret(x=local_db['map_size']['width'] / 2 + 100),
        Turret(x=local_db['map_size']['width'] / 2 - 50),
        Turret(x=local_db['map_size']['width'] / 2 - 100),
        Turret(y=local_db['map_size']['height'] / 2 + 50),
        Turret(y=local_db['map_size']['height'] / 2 + 100),
        Turret(y=local_db['map_size']['height'] / 2 - 50),
        Turret(y=local_db['map_size']['height'] / 2 - 100),
        # Turret(x=local_db['map_size']['width'] / 2 + 300),
        # Turret(x=local_db['map_size']['width'] / 2 + 150,
        #        y=local_db['map_size']['height'] / 2 + 150),
        # Turret(x=local_db['map_size']['width'] / 2 + 150,
        #        y=local_db['map_size']['height'] / 2 - 150),
    ])


def main_ticker(server):
    pre_loader()
    while True:
        gevent.sleep(0.01)
        data = {
            'ai': {
                'turrets': Turret.get_all()
            },
            'users': {
                'update': [
                    char.to_dict()
                    for char in local_db['characters'].values()
                ],
                'remove': []
            },
            'count': len(server.clients),
        }
        if not main_queue.empty():
            result = main_queue.get_nowait()
            data['users']['remove'].append(result)

        for client in server.clients.values():
            try:
                client.ws.send(json.dumps({
                    'msg_type': 'users_map', 'data': data}))
            except WebSocketError:
                pass


if __name__ == '__main__':
    try:
        # TiledReader.read_and_add_collision(
        #     os.path.join(settings.ASSETS_PATH, 'map.tmx'))
        CharacterModel.delete()
        log_params = {}
        if not settings.DEBUG:
            log_params['default_level'] = logging.ERROR
        else:
            log_params['default_level'] = logging.DEBUG
        setup_logging(**log_params)
        logging.info('Starting server...\n')
        server = WebSocketServer(
            settings.WEBSOCKET_ADDRESS, Resource(OrderedDict({
                '/game': GameApplication
            })))
        server._spawn(main_ticker, server)
        server.serve_forever()
    except KeyboardInterrupt:
        logging.info('Killing server...\n')
