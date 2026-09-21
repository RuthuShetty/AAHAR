# AAHAR Silage Probe Node — ESP-IDF Build Definition
cmake_minimum_required(VERSION 3.16)

include($ENV{IDF_PATH}/tools/cmake/project.cmake OPTIONAL)

project(aahar-firmware-probe C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(EXTRA_COMPONENT_DIRS
    "${CMAKE_CURRENT_LIST_DIR}/sensors"
    "${CMAKE_CURRENT_LIST_DIR}/lora"
    "${CMAKE_CURRENT_LIST_DIR}/power"
)

include_directories(
    include
    include/contracts
    sensors
    lora
    power
    src
)
