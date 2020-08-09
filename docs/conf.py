import os
import sys
from datetime import date
sys.path.insert(0, os.path.abspath('.'))

import apschedulerui

# -- Project information -----------------------------------------------------

project = apschedulerui.__project__
author = apschedulerui.__author__
copyright = u'Copyright 2020 - {0} {1}'.format(date.today().year, author)


version = apschedulerui.__version__
release = version

# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.intersphinx",
    "sphinx.ext.viewcode",
    "sphinx.ext.autosummary",
    "sphinx.ext.napoleon"
]

# Add any paths that contain templates here, relative to this directory.
templates_path = ['_templates']

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

autodoc_member_order = 'bysource'
autosummary_generate = True

intersphinx_mapping = {
    'python': ('https://docs.python.org/3', None),
    'apscheduler': ('https://apscheduler.readthedocs.io/en/stable', None)
}

# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
html_theme = 'alabaster'

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ['_static']
