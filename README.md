# _FIRST_ Tech Challenge Stack Light

The Stack Light is used by the FTAs and Field Staff to determine what state the field is in.

<br/>

![Match Flow](https://user-images.githubusercontent.com/16443111/75427163-a5ab2780-594e-11ea-96d0-57cd5ac57c35.jpg)

|          | Red LED                | Blue LED                | Amber LED   | Green LED     |
| -------- | ---------------------- | ----------------------- | ----------- | ------------- |
| Flashing | 8s Preparing Period    | 8s Preparing Period     | Randomaized | Field Reset   |
| Solid    | Red Alliance ready     | Blue Alliance ready     | Randomaized | Match running |
| Off      | Red Alliance not ready | Blue Alliance not ready | N/A         | N/A           |

Red Flashing = Disconnected from server<br/>
Red + Amber Flashing = Match Aborted

### Running locally

> Node.js 12 and later is required.

1. Clone the repository and run `npm install`
2. Setup your configuration in `config.js`
3. Start the server with `npm run start`
4. Update the variables in the Arduino code and download it to each board

<img src="https://user-images.githubusercontent.com/16443111/102985592-12179880-4518-11eb-9067-360309e3b5da.png" width="350" />
