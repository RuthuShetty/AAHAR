# AAHAR Handheld NIR Scanner — ESP-IDF Build Definition
cmake_minimum_required(VERSION 3.16)

# Include ESP-IDF project configuration
include($ENV{IDF_PATH}/tools/cmake/project.cmake OPTIONAL)

project(aahar-firmware-handheld C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Component directories
set(EXTRA_COMPONENT_DIRS
    "${CMAKE_CURRENT_LIST_DIR}/drivers"
    "${CMAKE_CURRENT_LIST_DIR}/optics"
    "${CMAKE_CURRENT_LIST_DIR}/ble"
    "${CMAKE_CURRENT_LIST_DIR}/power"
)

include_directories(
    include
    include/contracts
    drivers
    optics
    ble
    power
    src
)
