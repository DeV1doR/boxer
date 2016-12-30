import logging
import math
import random

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
        if not hasattr(self, '_alphas'):
            alpha = self.alpha / 2
            if direction == 'left':
                self._alphas = 180 - alpha
            elif direction == 'right':
                self._alphas = -alpha
            elif direction == 'top':
                self._alphas = -90 - alpha
            elif direction == 'bottom':
                self._alphas = 90 - alpha

        return self._alphas

    def _get_alphae(self, direction):
        if not hasattr(self, '_alphae'):
            self._alphae = self._get_alphas(direction) + self.alpha
        return self._alphae


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

    def shoot(self, user, detected):
        return self._w.shoot(user, detected)

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

    DMG = (15, 25)
    RANGE = 210  # px
    SPECTRE = 30  # degree
    CRIT_CHANCE = 10  # persent
    CRIT_MULTIPLIER = 4

    @property
    def damage(self):
        return int(random.choice(xrange(self.DMG[0],
                                        self.DMG[1],
                                        1)))

    @property
    def random_score(self):
        return int(self.damage * self.RANGE / 100)

    def shoot(self, user, detected):
        def _det_update(other, calc_damage):
            if random.randrange(100) < self.CRIT_CHANCE:
                calc_damage = self.CRIT_MULTIPLIER * calc_damage
            other.health -= calc_damage
            if other.is_dead:
                other.kill()
                user.scores += self.random_score
                user.save()
            else:
                other.save()

        calc_damage = int(self.damage / len(detected))
        gevent.joinall([
            gevent.spawn(_det_update(other, calc_damage))
            for other in detected])
