#include <stdio.h>
#include <unistd.h>

int main() {
    printf("Hello from QEMU!\n");
    printf("PID: %d\n", getpid());
    
    // Debugging checkpoint
    int counter = 0;
    for (int i = 0; i < 5; i++) {
        counter += i;
        printf("Counter: %d\n", counter);
        sleep(1);
    }
    
    printf("Program completed\n");
    return 0;
}