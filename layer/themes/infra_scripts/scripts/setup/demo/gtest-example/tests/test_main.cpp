#include <gtest/gtest.h>

// This file is optional when using gtest_main, but included for completeness
// You can add global test environment setup here if needed

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}