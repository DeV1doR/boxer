import logging
import math

import gevent

from constants import WeaponType


class WeaponVision(object):

    def __init__(self, R, alpha):
        self.R = R
        self.alpha = alpha

    def in_sector(self, user, other):
        def are_clockwise(center, radius, angle, point2):
            point1 = (
                (center[0] + radius) * math.cos(math.radians(angle)),
                (center[1] + radius) * math.sin(math.radians(angle))
            )
            return bool(-point1[0] * point2[1] + point1[1] * point2[0] > 0)

        points = [
            (other.x + (other.width / 2), other.y + (other.height / 2)),
            (other.x + (other.width / 2), other.y),
            # (other.x + other.width, other.y),
            # (other.x, other.y + (other.height / 2)),
            # (other.x, other.y + other.height),
            (other.x + (other.width / 2), other.y + other.height),
            # (other.x + other.width, other.y + other.height),
            # (other.x + other.width, other.y + (other.height / 2)),
        ]
        center = (user.x + (user.width / 2), user.y + (user.height / 2))
        radius = self.R
        angle1 = self._get_alphas(user.direction)
        angle2 = self._get_alphae(user.direction)

        logging.debug('Points: %s', points)
        logging.debug('Width: %s', other.width)
        logging.debug('Height: %s', other.height)

        for point in points:
            rel_point = (point[0] - center[0], point[1] - center[1])

            logging.debug('--------------')
            logging.debug('Search point - x:%s, y:%s' % point)
            logging.debug('Radius center - x:%s, y:%s' % center)
            logging.debug('Radius length - %s' % radius)
            logging.debug('Angle start - %s' % angle1)
            logging.debug('Angle end - %s' % angle2)
            logging.debug('Point diff - x:%s, y:%s' % rel_point)
            logging.debug('--------------')

            is_detected = bool(
                not are_clockwise(center, radius, angle1, rel_point) and
                are_clockwise(center, radius, angle2, rel_point) and
                (rel_point[0] ** 2 + rel_point[1] ** 2 <= radius ** 2))
            if is_detected:
                return True
        else:
            return False

    def _get_alphas(self, direction):
        alpha = self.alpha / 2
        if direction == 'left':
            return 180 - alpha
        elif direction == 'right':
            return -alpha
        elif direction == 'top':
            return -90 - alpha
        elif direction == 'bottom':
            return 90 - alpha

    def _get_alphae(self, direction):
        return self._get_alphas(direction) + self.alpha

    def _get_user_sector_center(self):
        result = (self.user.x + (self.user.width / 2),
                  self.user.y + (self.user.height / 2))
        logging.info('Sector start coords: (%s, %s)' % result)
        return result


class Weapon(object):

    def __init__(self, name):
        _weapons = {
            WeaponType.NO_WEAPON: NoWeapon,
            WeaponType.M60: M60Weapon
        }
        if isinstance(name, dict):
            name = name['name']
        self.name = name
        self._w = _weapons[name]()
        self.vision = WeaponVision(
            R=self._w.RANGE,
            alpha=self._w.SPECTRE
        )

    def in_vision(self, user, other):
        return self.vision.in_sector(user, other)

    def shoot(self, detected):
        return self._w.shoot(detected)

    def get_vision_params(self, direction):
        return {
            'radius': self.vision.R,
            'alphas': self.vision._get_alphas(direction),
            'alphae': self.vision._get_alphae(direction),
        }


class NoWeapon(object):

    DMG = 1
    RANGE = 1
    SPECTRE = 1

    def shoot(self, detected):
        raise NotImplementedError()


class M60Weapon(object):

    DMG = 60
    RANGE = 200
    SPECTRE = 30

    def shoot(self, detected):
        def _det_update(user, calc_damage):
            user.health -= calc_damage
            user.save()

        calc_damage = int(self.DMG / len(detected))
        gevent.joinall([
            gevent.spawn(_det_update(user, calc_damage))
            for user in detected])
