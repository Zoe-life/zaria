/* Sample C file for Zaria multi-language fixture. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_NAME 64
#define MAX_RECORDS 1024

typedef struct {
    int id;
    char name[MAX_NAME];
    double value;
} Record;

static int record_count = 0;
static Record records[MAX_RECORDS];

int add_record(int id, const char *name, double value) {
    if (record_count >= MAX_RECORDS) return -1;
    records[record_count].id = id;
    strncpy(records[record_count].name, name, MAX_NAME - 1);
    records[record_count].name[MAX_NAME - 1] = '\0';
    records[record_count].value = value;
    record_count++;
    return 0;
}

void trim_names(void) {
    for (int i = 0; i < record_count; i++) {
        char *p = records[i].name;
        size_t len = strlen(p);
        while (len > 0 && p[len - 1] == ' ') {
            p[--len] = '\0';
        }
    }
}

char *load_file(const char *path) {
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    rewind(f);
    char *buf = malloc((size_t)sz + 1);
    if (!buf) { fclose(f); return NULL; }
    fread(buf, 1, (size_t)sz, f);
    buf[sz] = '\0';
    fclose(f);
    return buf;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "usage: sample <path>\n");
        return 1;
    }
    char *content = load_file(argv[1]);
    if (!content) {
        perror("load_file");
        return 1;
    }
    printf("%.80s\n", content);
    free(content);
    return 0;
}
