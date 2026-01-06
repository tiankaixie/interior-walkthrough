
import { Canvas } from "@react-three/fiber";
import {
  PointerLockControls,
  Loader
} from "@react-three/drei";
import { Physics } from "@react-three/cannon";
import { Gallery } from "./Gallery";
import './App.css';
import { Player } from "./Player";
import { Floor } from './Floor';

function App() {
  return (
    <>
      <Canvas shadows camera={{fov: 45}} position={[0,1,0]} target={[1,1,1]}>
        <color attach="background" args={["#000000"]} />
        <Gallery />
        <Physics gravity={[0, -9.8, 0]}>
          <Player controls position={[0, 0.5, 7]} args={[0.5]} color="yellow" />
          <Floor rotation={[Math.PI / -2, 0, 0]} color={"#000000"} />
        </Physics>
        <PointerLockControls />
      </Canvas>
      <Loader />
    </>
  );
}

export default App;
