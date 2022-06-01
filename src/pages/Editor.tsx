import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Socket } from "socket.io-client";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import ACTIONS from "../actions";
import Client from "../components/Clients";
import Editor from "../components/Editor";
import { initSocket } from "../socket";

interface StateType {
  state: { username: string };
}

interface ClientType {
  socketId: string;
  username: string;
}

export default function EditorPage() {
  const [socketRef, setSocketRef] =
    useState<Socket<DefaultEventsMap, DefaultEventsMap>>();
  const codeRef = useRef<any>(null);
  const location = useLocation() as StateType;
  const { roomId } = useParams();
  const reactNavigator = useNavigate();

  const [clients, setClients] = useState<ClientType[]>([]);

  useEffect(() => {
    if (!socketRef) {
      const init = async () => {
        const temp = await initSocket();
        setSocketRef(temp);
      };
      init();
    } else {
      const handleErrors = (e: any) => {
        console.log("socket error", e);
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      };
      socketRef.on("connect_error", (err) => handleErrors(err));
      socketRef.on("connect_failed", (err) => handleErrors(err));

      socketRef.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state.username,
      });

      // Listening for joined event
      socketRef.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
        if (username !== location.state.username) {
          toast.success(`${username} has joined the room.`);
        }
        setClients(clients);
        
        socketRef.emit(ACTIONS.SYNC_CODE, {
          code: codeRef.current ? codeRef.current.getValue() : "",
          socketId,
        });
      });

      // Listening for disconnect
      socketRef.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });
      return () => {
        socketRef.disconnect();
        socketRef.off(ACTIONS.JOINED);
        socketRef.off(ACTIONS.DISCONNECTED);
      };
    }
  }, [socketRef, codeRef]);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId as string);
      toast.success("Room ID copied successfully");
      // console.log(codeRef)
    } catch (error) {
      console.log(error);
      toast.error("Something wrong happened");
    }
  };

  const leaveRoom = () => {
    reactNavigator("/");
  };

  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img
              className="logoImage"
              src="https://github.com/codersgyan/realtime-code-editor/blob/main/public/code-sync.png?raw=true"
              alt="logo"
            />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick={copyRoomId}>
          Copy ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
      </div>
      <div className="editorWrap">
        <Editor
          socketRef={socketRef as Socket<DefaultEventsMap, DefaultEventsMap>}
          roomId={roomId as string}
          onCodeChange={(code: any) => {
            codeRef.current = code;
          }}
        />
      </div>
    </div>
  );
}
