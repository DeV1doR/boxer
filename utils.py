import os
import sys
import logging.config

import yaml
import gevent


PY2 = sys.version_info[0] == 2
PY3 = sys.version_info[0] == 3


def setup_logging(default_path='conf/logging.yaml', default_level=logging.INFO,
                  env_key='LOG_CFG'):
    """Setup logging configuration

    """
    path = default_path
    value = os.getenv(env_key, None)
    if value:
        path = value
    if os.path.exists(path):
        with open(path, 'rt') as f:
            config = yaml.safe_load(f.read())
        logging.config.dictConfig(config)
    else:
        logging.basicConfig(level=default_level)


def await_greenlet(func, *args, **kwargs):
    thread = gevent.spawn(func, *args, **kwargs)
    thread.join()
    return thread.value
