# GDB Remote Debugging Script
set architecture i386:x86-64
target remote :1234
file /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello
symbol-file /home/ormastes/dev/aidev/layer/themes/init_qemu/gen/test-output/hello.debug

# Set breakpoints
break main
break *main+20

# Commands to run at each breakpoint
commands 1
  echo \n=== Hit main() ===\n
  info registers
  info locals
  continue
end

commands 2
  echo \n=== Hit main+20 ===\n
  print counter
  backtrace
  continue
end

# Start execution
continue

# Detach when done
detach
quit