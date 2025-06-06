#!/usr/bin/env python3
import yaml
import sys

try:
    with open(sys.argv[1], 'r') as file:
        yaml.safe_load(file)
    print(f"YAML file {sys.argv[1]} is valid!")
except Exception as e:
    print(f"YAML validation error in {sys.argv[1]}: {e}")
    sys.exit(1)
