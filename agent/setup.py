from setuptools import setup, find_packages

setup(
    name="codemetrics",
    version="0.1.0",
    packages=find_packages(),
    entry_points={"console_scripts": ["codemetrics=codemetrics.cli:main"]},
    python_requires=">=3.9",
)
