#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[]) {
    printf("Hello, World from C!\n");
    printf("Arguments: %d\n", argc);
    for (int i = 0; i < argc; i++) {
        printf("  [%d]: %s\n", i, argv[i]);
    }
    
    // Add a breakpoint-friendly line
    int x = 42;
    printf("Debug value: %d\n", x);
    
    return 0;
}