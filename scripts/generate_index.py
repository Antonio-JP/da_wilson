#!/usr/bin/env python3
"""
Generate a JSON index of files in latex/, maple/, mathematica/, and sage/.
Writes `files_index.json` to repository root.
"""
import os
import json
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
folders = ['latex', 'maple', 'mathematica', 'sage']

def parse_filename(name):
    base = re.sub(r"\.[^.]+$", '', name)
    m = re.match(r'^\((\d+)_(\d+)\)\[([^\]]+)\]$', base)
    if not m:
        return None
    n = int(m.group(1)); mm = int(m.group(2)); inside = m.group(3)
    if inside == 'P':
        return {'name': name, 'n': n, 'm': mm, 'type': 'P', 'j': None}
    h = re.match(r'^H_(\d+)$', inside)
    if h:
        return {'name': name, 'n': n, 'm': mm, 'type': 'H', 'j': int(h.group(1))}
    return None

def main():
    all_files = []
    for folder in folders:
        path = os.path.join(ROOT, 'data', folder)
        if not os.path.isdir(path):
            continue
        for fname in os.listdir(path):
            fpath = os.path.join('data', folder, fname)
            meta = parse_filename(fname)
            entry = {'name': fname, 'path': fpath, 'folder': folder}
            if meta:
                entry.update(meta)
            all_files.append(entry)

    out = {'files': all_files}
    outpath = os.path.join(ROOT, 'files_index.json')
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f'Wrote {len(all_files)} entries to {outpath}')

if __name__ == '__main__':
    main()
