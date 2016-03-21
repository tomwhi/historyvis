from setuptools import setup

setup(name='monarchvis',
      version='0.1.0',
      packages=['wikiscraper'],
      include_package_data=True,
      entry_points={
          'console_scripts': [
              'wikiscaper = wikiscraper.__main__:main'
          ]
      },
      )