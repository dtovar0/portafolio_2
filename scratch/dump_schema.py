import sqlite3

def dump_schema(db_path, output_path):
    conn = sqlite3.connect(db_path)
    with open(output_path, 'w') as f:
        for line in conn.iterdump():
            if 'INSERT' not in line: # We only want the structure
                f.write('%s\n' % line)
    conn.close()

if __name__ == "__main__":
    dump_schema('nexus.db', '../nexus_master/nexus_structure.sql')
